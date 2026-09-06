<?php

use App\Modules\Payroll\Models\Agreement;
use App\Modules\Payroll\Models\Employee;
use App\Modules\Payroll\Models\EmployeeRate;
use App\Modules\Payroll\Models\Period;
use App\Modules\Payroll\Models\ReviewItem;
use App\Modules\Payroll\Models\Run;
use App\Modules\Payroll\Models\RunEvent;
use App\Modules\Payroll\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => seedAuthReferenceData());

/*
|--------------------------------------------------------------------------
| The payroll run state machine and the review loop
|--------------------------------------------------------------------------
|
| Covers the transitions themselves, the guards that are NOT pure status
| (open change requests, invalid lines), and the audit trail — one
| payroll_run_events row per transition, no more and no fewer.
|
*/

/*
|--------------------------------------------------------------------------
| Happy path
|--------------------------------------------------------------------------
*/

it('walks draft to ready_to_process through the full review loop', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    expect($run->status)->toBe('draft');

    // Client submits.
    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/runs/{$run->guid}/submit")->assertOk();
    expect($run->fresh()->status)->toBe('submitted');

    // Accountant claims and sends it back with a query.
    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/runs/{$run->guid}/start-review")->assertOk();
    expect($run->fresh()->status)->toBe('in_review');

    $lineId = $run->lines()->first()->id;
    $this->postJson("/payroll/runs/{$run->guid}/request-changes", [
        'items' => [[
            'payroll_run_line_id' => $lineId,
            'field'               => 'overtime_hours',
            'comment'             => 'Please confirm the overtime.',
        ]],
    ])->assertOk();
    expect($run->fresh()->status)->toBe('client_update_required');

    // Client answers, then resubmits.
    Sanctum::actingAs($s['client']);
    $item = ReviewItem::where('payroll_run_id', $run->id)->first();
    $this->postJson("/payroll/runs/{$run->guid}/review-items/{$item->id}/respond", [
        'response' => 'Confirmed, two extra shifts.',
    ])->assertOk();

    $this->postJson("/payroll/runs/{$run->guid}/submit")->assertOk();
    $run = $run->fresh();
    expect($run->status)->toBe('resubmitted')
        // A resubmission is a new version of the same run.
        ->and($run->version)->toBe(2);

    // Accountant re-reviews and approves.
    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/runs/{$run->guid}/start-review")->assertOk();
    $this->postJson("/payroll/runs/{$run->guid}/approve")->assertOk();

    expect($run->fresh()->status)->toBe('ready_to_process');
    // Approving closes the period.
    expect($s['period']->fresh()->status)->toBe('closed');
});

it('writes exactly one event per transition', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/runs/{$run->guid}/submit")->assertOk();

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/runs/{$run->guid}/start-review")->assertOk();
    $this->postJson("/payroll/runs/{$run->guid}/approve")->assertOk();

    // created, submitted, review_started, approved
    $events = RunEvent::where('payroll_run_id', $run->id)->orderBy('id')->get();

    expect($events)->toHaveCount(4)
        ->and($events->pluck('action')->all())
        ->toBe(['created', 'submitted', 'review_started', 'approved'])
        ->and($events->last()->to_status)->toBe('ready_to_process')
        ->and($events->last()->from_status)->toBe('in_review');
});

/*
|--------------------------------------------------------------------------
| Illegal transitions
|--------------------------------------------------------------------------
*/

it('rejects approving a run that has not been claimed', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/runs/{$run->guid}/submit")->assertOk();

    // submitted -> ready_to_process is not a legal edge.
    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/runs/{$run->guid}/approve")
        ->assertStatus(422)
        ->assertJsonPath('message', 'INVALID_STATUS_TRANSITION');
});

it('rejects claiming a run that is still a draft', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/runs/{$run->guid}/start-review")
        ->assertStatus(422)
        ->assertJsonPath('message', 'INVALID_STATUS_TRANSITION');
});

it('rejects requesting changes on a run that is not in review', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/runs/{$run->guid}/request-changes", [
        'items' => [['comment' => 'why']],
    ])->assertStatus(422)->assertJsonPath('message', 'INVALID_STATUS_TRANSITION');
});

it('locks the lines once the run is submitted', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/runs/{$run->guid}/submit")->assertOk();

    $line = $run->lines()->first();
    $this->postJson("/payroll/runs/{$run->guid}/lines", [
        'lines' => [['id' => $line->id, 'regular_hours' => 999]],
    ])->assertStatus(422)->assertJsonPath('message', 'PAYROLL_RUN_LOCKED');
});

/*
|--------------------------------------------------------------------------
| Guards that are not pure status
|--------------------------------------------------------------------------
*/

it('blocks approval while a change request is still open', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/runs/{$run->guid}/submit")->assertOk();

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/runs/{$run->guid}/start-review")->assertOk();
    $this->postJson("/payroll/runs/{$run->guid}/request-changes", [
        'items' => [['comment' => 'confirm please']],
    ])->assertOk();

    // Client resubmits without answering — the loop must not close.
    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/runs/{$run->guid}/submit")
        ->assertStatus(422)
        ->assertJsonPath('message', 'RUN_HAS_OPEN_CHANGE_REQUESTS');
});

it('blocks submission when an hourly employee has no hours', function () {
    $s = payrollScenario();

    Sanctum::actingAs($s['client']);
    $response = $this->postJson("/payroll/{$s['firm']->guid}/runs/start", [
        'payroll_period_id' => $s['period']->id,
    ])->assertOk();

    // Left exactly as created: the hourly line has zero hours.
    $run = Run::where('guid', $response->json('payload.guid'))->first();

    $this->postJson("/payroll/runs/{$run->guid}/submit")
        ->assertStatus(422)
        ->assertJsonPath('message', 'RUN_HAS_INVALID_LINES');
});

it('reports the same issues from validate as submit enforces', function () {
    $s = payrollScenario();

    Sanctum::actingAs($s['client']);
    $response = $this->postJson("/payroll/{$s['firm']->guid}/runs/start", [
        'payroll_period_id' => $s['period']->id,
    ])->assertOk();
    $run = Run::where('guid', $response->json('payload.guid'))->first();

    $validate = $this->postJson("/payroll/runs/{$run->guid}/validate")->assertOk();

    expect($validate->json('payload.passed'))->toBeFalse()
        ->and(collect($validate->json('payload.errors'))->pluck('code'))
        ->toContain('MISSING_HOURS');
});

it('blocks starting a run when payroll is not active', function () {
    $s = payrollScenario();
    // Payroll is off when no agreement is agreed — the settings row's own
    // status is a progress indicator and no longer gates anything.
    Agreement::where('firm_id', $s['firm']->id)->update(['status' => 'Inactive']);

    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/{$s['firm']->guid}/runs/start", [
        'payroll_period_id' => $s['period']->id,
    ])->assertStatus(422)->assertJsonPath('message', 'PAYROLL_AGREEMENT_NOT_ACTIVE');
});

/*
|--------------------------------------------------------------------------
| Server-owned figures
|--------------------------------------------------------------------------
*/

it('computes gross server-side and ignores whatever the client sends', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    $hourly = $run->lines()->where('pay_basis', 'hourly')->first();

    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/runs/{$run->guid}/lines", [
        'lines' => [[
            'id'             => $hourly->id,
            'regular_hours'  => 80,
            'overtime_hours' => 10,
            // A client-supplied gross must be discarded outright.
            'gross_amount'   => 999999,
        ]],
    ])->assertOk();

    // 28.00 * 80 + 28.00 * 1.5 * 10 = 2240 + 420
    expect((float) $hourly->fresh()->gross_amount)->toBe(2660.00);
});

it('keeps the header totals in step with the lines', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    $run = $run->fresh();

    expect($run->employee_count)->toBe(2)
        ->and((float) $run->total_gross)->toBe(
            (float) $run->lines()->sum('gross_amount')
        );
});

/*
|--------------------------------------------------------------------------
| One run per period
|--------------------------------------------------------------------------
*/

it('returns the existing run rather than creating a second one for a period', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    Sanctum::actingAs($s['client']);
    $again = $this->postJson("/payroll/{$s['firm']->guid}/runs/start", [
        'payroll_period_id' => $s['period']->id,
    ])->assertOk();

    expect($again->json('payload.guid'))->toBe($run->guid)
        ->and(Run::where('payroll_period_id', $s['period']->id)->count())->toBe(1);
});
