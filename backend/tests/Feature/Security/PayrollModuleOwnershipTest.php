<?php

use App\Modules\Payroll\Models\Agreement;
use App\Modules\Payroll\Models\Employee;
use App\Modules\Payroll\Models\Period;
use App\Modules\Payroll\Models\Run;
use App\Modules\Payroll\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => seedAuthReferenceData());

/*
|--------------------------------------------------------------------------
| Payroll cross-firm isolation and role boundaries
|--------------------------------------------------------------------------
|
| Payroll carries pay rates and hours for every employee at every client, so
| the firm boundary matters more here than almost anywhere else in the system.
|
| Two tiers are under test:
|   - authorizeFirmScope        — reads, and the client's own writes
|   - authorizeFirmManageAction — staff-only writes; denies Client, Employee
|                                 and platform Staff outright
|
*/

/** A firm with payroll switched on and one draft run ready to act against. */
function payrollFirm(): array
{
    $firm = makeFirm(['payment_type' => 'Bi-Weekly']);

    Setting::create([
        'firm_id'            => $firm->id,
        'status'             => 'Not Started',
        'pay_frequency'      => 'Bi-Weekly',
        'period_anchor_date' => '2026-01-05',
    ]);

    // Payroll is switched on by an agreed agreement, not by the settings row —
    // Setting::isActive() reads this.
    Agreement::create([
        'firm_id'       => $firm->id,
        'version'       => 1,
        'status'        => 'Agreed',
        'pay_frequency' => 'Bi-Weekly',
        'sent_at'       => now(),
        'accepted_at'   => now(),
    ]);

    $period = Period::create([
        'firm_id'       => $firm->id,
        'pay_frequency' => 'Bi-Weekly',
        'sequence'      => 1,
        'year'          => 2026,
        'period_start'  => '2026-01-05',
        'period_end'    => '2026-01-18',
        'pay_date'      => '2026-01-22',
        'cutoff_date'   => '2026-01-20',
        'status'        => 'open',
    ]);

    $run = Run::create([
        'firm_id'           => $firm->id,
        'payroll_period_id' => $period->id,
        'guid'              => 'RUN' . random_int(1000000, 9999999),
        'status'            => 'submitted',
    ]);

    return [$firm, $period, $run];
}

/*
|--------------------------------------------------------------------------
| Cross-firm reads
|--------------------------------------------------------------------------
*/

it('denies a Client reading another firm payroll settings', function () {
    [$otherFirm] = payrollFirm();
    $ownFirm = makeFirm();
    Sanctum::actingAs(makeUser('Client', ['firm_id' => $ownFirm->id]));

    $this->postJson("/payroll/{$otherFirm->guid}/agreements/settings")->assertForbidden();
});

it('allows a Client reading their own firm payroll settings', function () {
    [$firm] = payrollFirm();
    Sanctum::actingAs(makeUser('Client', ['firm_id' => $firm->id]));

    $this->postJson("/payroll/{$firm->guid}/agreements/settings")->assertOk();
});

it('denies a Client listing another firm payroll employees', function () {
    [$otherFirm] = payrollFirm();
    $ownFirm = makeFirm();
    Sanctum::actingAs(makeUser('Client', ['firm_id' => $ownFirm->id]));

    $this->postJson("/payroll/{$otherFirm->guid}/employees/all")->assertForbidden();
});

it('denies a Client listing another firm pay periods', function () {
    [$otherFirm] = payrollFirm();
    $ownFirm = makeFirm();
    Sanctum::actingAs(makeUser('Client', ['firm_id' => $ownFirm->id]));

    $this->postJson("/payroll/{$otherFirm->guid}/periods/all")->assertForbidden();
});

it('denies an Employee reading a run belonging to another firm', function () {
    [, , $run] = payrollFirm();
    $ownFirm = makeFirm();
    Sanctum::actingAs(makeUser('Employee', ['firm_id' => $ownFirm->id]));

    $this->postJson("/payroll/runs/{$run->guid}/view")->assertForbidden();
});

it('denies a user with no firm at all', function () {
    [$firm] = payrollFirm();
    Sanctum::actingAs(makeUser('Employee'));

    $this->postJson("/payroll/{$firm->guid}/employees/all")->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| Accountant needs an org-assignment on that specific firm
|--------------------------------------------------------------------------
*/

it('denies an Accountant with no org-assignment on the firm', function () {
    [$firm] = payrollFirm();
    Sanctum::actingAs(makeUser('Accountant'));

    $this->postJson("/payroll/{$firm->guid}/agreements/create", [
        'body' => 'Payroll services for this firm.',
    ])->assertForbidden();
});

it('allows an Accountant holding manage_payroll on that firm', function () {
    [$firm] = payrollFirm();
    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $firm, 'lead_acc');
    Sanctum::actingAs($accountant);

    $this->postJson("/payroll/{$firm->guid}/agreements/create", [
        'body' => 'Payroll services for this firm.',
    ])->assertOk();
});

it('denies that same Accountant acting on a different firm', function () {
    [$assigned] = payrollFirm();
    [$other] = payrollFirm();
    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $assigned, 'lead_acc');
    Sanctum::actingAs($accountant);

    $this->postJson("/payroll/{$other->guid}/agreements/create", [
        'body' => 'Payroll services for this firm.',
    ])->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| Staff-only transitions are closed to the Client, even on their own firm
|--------------------------------------------------------------------------
*/

it('denies a Client approving their own payroll', function () {
    [$firm, , $run] = payrollFirm();
    Sanctum::actingAs(makeUser('Client', ['firm_id' => $firm->id]));

    $this->postJson("/payroll/runs/{$run->guid}/approve")->assertForbidden();
});

it('denies a Client claiming the review on their own payroll', function () {
    [$firm, , $run] = payrollFirm();
    Sanctum::actingAs(makeUser('Client', ['firm_id' => $firm->id]));

    $this->postJson("/payroll/runs/{$run->guid}/start-review")->assertForbidden();
});

it('denies a Client requesting changes on their own payroll', function () {
    [$firm, , $run] = payrollFirm();
    Sanctum::actingAs(makeUser('Client', ['firm_id' => $firm->id]));

    $this->postJson("/payroll/runs/{$run->guid}/request-changes", [
        'items' => [['comment' => 'please confirm']],
    ])->assertForbidden();
});

it('denies a Client reopening their own approved payroll', function () {
    [$firm, , $run] = payrollFirm();
    Sanctum::actingAs(makeUser('Client', ['firm_id' => $firm->id]));

    $this->postJson("/payroll/runs/{$run->guid}/reopen", ['reason' => 'oops'])->assertForbidden();
});

it('denies an Employee approving a run at their own firm', function () {
    [$firm, , $run] = payrollFirm();
    Sanctum::actingAs(makeUser('Employee', ['firm_id' => $firm->id]));

    $this->postJson("/payroll/runs/{$run->guid}/approve")->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| Platform Staff is read-only across payroll, whatever org role they hold
|--------------------------------------------------------------------------
*/

it('denies Staff approving a payroll even with lead_acc on the firm', function () {
    [$firm, , $run] = payrollFirm();
    $staff = makeUser('Staff');
    assignOrgRole($staff, $firm, 'lead_acc');
    Sanctum::actingAs($staff);

    $this->postJson("/payroll/runs/{$run->guid}/approve")->assertForbidden();
});

it('denies Staff creating an agreement even with lead_acc on the firm', function () {
    [$firm] = payrollFirm();
    $staff = makeUser('Staff');
    assignOrgRole($staff, $firm, 'lead_acc');
    Sanctum::actingAs($staff);

    $this->postJson("/payroll/{$firm->guid}/agreements/create", [
        'body' => 'Payroll services for this firm.',
    ])->assertForbidden();
});

it('denies Staff adding an employee to payroll', function () {
    [$firm] = payrollFirm();
    $staff = makeUser('Staff');
    assignOrgRole($staff, $firm, 'lead_acc');
    Sanctum::actingAs($staff);

    $this->postJson("/payroll/{$firm->guid}/employees/create", [
        'user_id'         => makeUser('Employee', ['firm_id' => $firm->id])->id,
        'employment_type' => 'full_time',
        'pay_basis'       => 'hourly',
        'hire_date'       => '2026-01-01',
    ])->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| Accepting an agreement is the client's act specifically
|--------------------------------------------------------------------------
*/

it('denies an Accountant accepting an agreement on the client behalf', function () {
    [$firm] = payrollFirm();
    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $firm, 'lead_acc');
    Sanctum::actingAs($accountant);

    // 'Sent' is what "with the client" looks like.
    // v2: payrollFirm() already holds the agreed v1 that switched payroll on,
    // and (firm_id, version) is unique.
    $agreement = Agreement::create([
        'firm_id'       => $firm->id,
        'version'       => 2,
        'status'        => 'Sent',
        'sent_at'       => now(),
        'pay_frequency' => 'Bi-Weekly',
        'body'          => 'Payroll services for this firm.',
    ]);

    $this->postJson("/payroll/{$firm->guid}/agreements/{$agreement->id}/accept", [
        'accepted' => true,
    ])->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| The cross-firm queue scopes itself
|--------------------------------------------------------------------------
*/

it('denies a Client reaching the accountant review queue', function () {
    payrollFirm();
    Sanctum::actingAs(makeUser('Client', ['firm_id' => makeFirm()->id]));

    $this->postJson('/payroll/review/queue')->assertForbidden();
});

it('shows an Accountant only the firms they are assigned to in the queue', function () {
    [$assigned] = payrollFirm();
    [$other] = payrollFirm();

    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $assigned, 'lead_acc');
    Sanctum::actingAs($accountant);

    $response = $this->postJson('/payroll/review/queue')->assertOk();

    // A row is a firm, so the id is the firm's own — the queue stopped
    // listing runs when it became the accountant's client list.
    $firmIds = collect($response->json('payload.data'))->pluck('id')->unique()->values();

    expect($firmIds)->toContain($assigned->id)
        ->and($firmIds)->not->toContain($other->id);
});

it('lists an assigned firm that has no payroll at all, ready to start an agreement', function () {
    // No payrollFirm() here: nothing in payroll_settings, payroll_agreements or
    // payroll_runs for this firm. It still has to appear, because this list is
    // where the accountant picks the client to raise the first agreement for.
    $firm = makeFirm(['payment_type' => 'Bi-Weekly']);

    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $firm, 'lead_acc');
    Sanctum::actingAs($accountant);

    $row = collect($this->postJson('/payroll/review/queue')->assertOk()->json('payload.data'))
        ->firstWhere('id', $firm->id);

    expect($row)->not->toBeNull()
        ->and($row['payroll_status'])->toBe('Not Started')
        // Reported from the column default even though this firm has no
        // agreement row at all.
        ->and($row['agreement_status'])->toBe('Pending')
        ->and($row['payroll_active'])->toBeFalse()
        ->and($row['can_create_agreement'])->toBeTrue()
        ->and($row['current_agreement'])->toBeNull()
        ->and($row['latest_run'])->toBeNull()
        ->and($row['runs_awaiting_review'])->toBe(0)
        ->and($row['open_review_items'])->toBe(0);

    // A listing must not write: reading the client list must not materialise a
    // payroll_settings row for every firm it touched.
    expect(Setting::where('firm_id', $firm->id)->exists())->toBeFalse();
});

it('counts only active employees in the queue row employee_count', function () {
    $firm = makeFirm(['payment_type' => 'Bi-Weekly']);

    foreach (['active', 'active', 'on_leave', 'terminated'] as $i => $status) {
        Employee::create([
            'firm_id'         => $firm->id,
            'user_id'         => makeUser('Employee', ['firm_id' => $firm->id])->id,
            'employee_number' => 'E-20' . $i,
            'employment_type' => 'full_time',
            'pay_basis'       => 'hourly',
            'hire_date'       => '2024-01-01',
            'status'          => $status,
        ]);
    }

    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $firm, 'lead_acc');
    Sanctum::actingAs($accountant);

    $row = collect($this->postJson('/payroll/review/queue')->assertOk()->json('payload.data'))
        ->firstWhere('id', $firm->id);

    // on_leave and terminated are excluded: this is the headcount the next run
    // would seed, matching Runs::start().
    expect($row['employee_count'])->toBe(2);
});

it('gives NA for last_payment_date until a run is approved, then the pay date', function () {
    [$firm, $period, $run] = payrollFirm();

    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $firm, 'lead_acc');
    Sanctum::actingAs($accountant);

    $row = fn () => collect($this->postJson('/payroll/review/queue')->assertOk()->json('payload.data'))
        ->firstWhere('id', $firm->id);

    // A run exists but has never been approved — nothing has been paid.
    expect($row()['last_payment_date'])->toBe('NA');

    // Approval to ready_to_process is the point payroll leaves this module for
    // the external system, so that is what counts as paid. The run starts
    // 'submitted', so only the review hop is needed to get there.
    $run->applyTransition('in_review', 'review_started');
    $run->applyTransition('ready_to_process', 'approved');

    expect($row()['last_payment_date'])->toBe(
        \Carbon\Carbon::parse($period->pay_date)->toDateString()
    );
});

it('takes payroll_due_date from the generated calendar, else the firm record', function () {
    // No payroll periods for this firm, so the date can only come from the
    // firm record's payment_type — Monthly means the end of this month.
    $firm = makeFirm(['payment_type' => 'Monthly']);

    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $firm, 'lead_acc');
    Sanctum::actingAs($accountant);

    $row = collect($this->postJson('/payroll/review/queue')->assertOk()->json('payload.data'))
        ->firstWhere('id', $firm->id);

    expect($row['payroll_due_date'])->toBe(now()->endOfMonth()->toDateString());

    // A generated period outranks the firm record, and the EARLIEST upcoming
    // pay date is the one due — not the furthest away.
    Period::create([
        'firm_id'       => $firm->id,
        'pay_frequency' => 'Monthly',
        'sequence'      => 1,
        'year'          => (int) now()->addMonths(2)->format('Y'),
        'period_start'  => now()->addMonths(2)->toDateString(),
        'period_end'    => now()->addMonths(2)->addDays(20)->toDateString(),
        'pay_date'      => now()->addMonths(2)->addDays(25)->toDateString(),
        'status'        => 'scheduled',
    ]);
    Period::create([
        'firm_id'       => $firm->id,
        'pay_frequency' => 'Monthly',
        'sequence'      => 2,
        'year'          => (int) now()->addDays(5)->format('Y'),
        'period_start'  => now()->toDateString(),
        'period_end'    => now()->addDays(3)->toDateString(),
        'pay_date'      => now()->addDays(5)->toDateString(),
        'status'        => 'scheduled',
    ]);

    $row = collect($this->postJson('/payroll/review/queue')->assertOk()->json('payload.data'))
        ->firstWhere('id', $firm->id);

    expect($row['payroll_due_date'])->toBe(now()->addDays(5)->toDateString());
});

it('filters the queue by payment_type, payroll_status, agreement_status and firm name', function () {
    $accountant = makeUser('Accountant');

    $weekly    = makeFirm(['payment_type' => 'Weekly',    'firm_name' => 'Alpha Weekly Ltd']);
    $biWeekly  = makeFirm(['payment_type' => 'Bi-Weekly', 'firm_name' => 'Beta BiWeekly Ltd']);
    $declined  = makeFirm(['payment_type' => 'Weekly',    'firm_name' => 'Gamma Declined Ltd']);

    foreach ([$weekly, $biWeekly, $declined] as $f) {
        assignOrgRole($accountant, $f, 'lead_acc');
    }

    // Only one firm gets stored rows; the other two have nothing at all, which
    // is what makes the default-value filters worth testing.
    Setting::create(['firm_id' => $weekly->id, 'status' => 'Submitted', 'pay_frequency' => 'Weekly']);
    Agreement::create([
        'firm_id' => $weekly->id, 'version' => 1, 'status' => 'Agreed',
        'pay_frequency' => 'Weekly', 'sent_at' => now(), 'accepted_at' => now(),
    ]);
    Agreement::create([
        'firm_id' => $declined->id, 'version' => 1, 'status' => 'Reject',
        'pay_frequency' => 'Weekly',
    ]);

    Sanctum::actingAs($accountant);

    $names = fn (array $params) => collect(
        $this->postJson('/payroll/review/queue', $params)->assertOk()->json('payload.data')
    )->pluck('firm_name')->sort()->values()->all();

    // Payroll frequency, straight off the firm record.
    expect($names(['payment_type' => 'Weekly']))->toBe(['Alpha Weekly Ltd', 'Gamma Declined Ltd'])
        ->and($names(['payment_type' => 'Bi-Weekly']))->toBe(['Beta BiWeekly Ltd']);

    // Stored payroll_status.
    expect($names(['payroll_status' => 'Submitted']))->toBe(['Alpha Weekly Ltd']);

    // 'Not Started' is the column default, so it must also return the two firms
    // that have no payroll_settings row at all.
    expect($names(['payroll_status' => 'Not Started']))->toBe(['Beta BiWeekly Ltd', 'Gamma Declined Ltd']);

    // A declined agreement must read as Reject, not fall through to 'Pending'.
    expect($names(['agreement_status' => 'Reject']))->toBe(['Gamma Declined Ltd'])
        ->and($names(['agreement_status' => 'Agreed']))->toBe(['Alpha Weekly Ltd']);

    // 'Pending' is the agreement default — only the firm with no agreement row.
    expect($names(['agreement_status' => 'Pending']))->toBe(['Beta BiWeekly Ltd']);

    // Firm name search, and filters combining as AND.
    expect($names(['search' => 'Beta']))->toBe(['Beta BiWeekly Ltd'])
        ->and($names(['payment_type' => 'Weekly', 'agreement_status' => 'Reject']))->toBe(['Gamma Declined Ltd'])
        ->and($names(['payment_type' => 'Bi-Weekly', 'agreement_status' => 'Reject']))->toBe([]);

    // Unknown values are rejected rather than silently ignored.
    $this->postJson('/payroll/review/queue', ['payment_type' => 'Fortnightly'])->assertStatus(422);
    $this->postJson('/payroll/review/queue', ['payroll_status' => 'Agreed'])->assertStatus(422);
});

it('reports an agreed agreement as an active payroll on the queue row', function () {
    [$firm] = payrollFirm();

    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $firm, 'lead_acc');
    Sanctum::actingAs($accountant);

    $row = collect($this->postJson('/payroll/review/queue')->assertOk()->json('payload.data'))
        ->firstWhere('id', $firm->id);

    // payroll_active comes from the agreement; payroll_status is the firm's
    // run progress, which is untouched by merely agreeing.
    expect($row['payroll_active'])->toBeTrue()
        ->and($row['agreement_status'])->toBe('Agreed')
        ->and($row['current_agreement']['status'])->toBe('Agreed')
        ->and($row['can_create_agreement'])->toBeFalse()
        ->and($row['payroll_status'])->toBe('Not Started');
});
