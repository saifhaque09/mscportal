<?php

use App\Modules\Payroll\Models\Employee;
use App\Modules\Payroll\Models\Period;
use App\Modules\Payroll\Models\Run;
use App\Modules\Payroll\Models\RunLine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => seedAuthReferenceData());

/*
|--------------------------------------------------------------------------
| Employees with their pay figures for a run
|--------------------------------------------------------------------------
|
| The figures live on payroll_run_lines, not on the employee, so this list is
| always read against one run: the named one, else the firm's latest.
|
| payrollScenario() and startAndFillRun() come from RunStateMachineTest.php —
| Pest loads every test file in the suite, so the helpers are shared.
|
*/

it('lists every employee with hours, gross pay and deductions for the latest run', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    // Put a deduction on one line so the column has something to show.
    $line = $run->lines()->where('pay_basis', 'hourly')->first();
    $line->update(['deduction_amount' => 125.50, 'deduction_label' => 'Union dues']);

    Sanctum::actingAs($s['accountant']);
    $response = $this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary")->assertOk();

    $meta = $response->json('payload.meta');
    $rows = collect($response->json('payload.data'))->keyBy('employee_id');

    // The run the figures were read from is named in the response.
    expect($meta['run']['guid'])->toBe($run->guid)
        ->and($meta['run']['period']['id'])->toBe($s['period']->id)
        ->and($rows)->toHaveCount(2);

    $hourly = $rows['E-1000'];

    expect($hourly['employee_type'])->toBe('full_time')
        ->and($hourly['pay_basis'])->toBe('hourly')
        ->and($hourly['status'])->toBe('active')
        ->and((float) $hourly['hours'])->toBe(80.0)
        ->and((float) $hourly['hours_breakdown']['regular'])->toBe(80.0)
        // 80h at 28.00
        ->and((float) $hourly['gross_pay'])->toBe(2240.0)
        ->and((float) $hourly['total_deduction'])->toBe(125.50)
        ->and($hourly['deduction_label'])->toBe('Union dues')
        ->and($hourly['employee_name'])->not->toBeEmpty();

    // The salaried employee is on the same run with a per-period amount.
    expect((float) $rows['E-1001']['gross_pay'])->toBe(1500.0)
        ->and((float) $rows['E-1001']['total_deduction'])->toBe(0.0);
});

it('returns null figures, not zeros, for an employee with no line in the run', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    // Somebody hired after the run was opened has no line in it.
    $user = makeUser('Employee', ['firm_id' => $s['firm']->id]);
    Employee::create([
        'firm_id'         => $s['firm']->id,
        'user_id'         => $user->id,
        'employee_number' => 'E-2000',
        'employment_type' => 'part_time',
        'pay_basis'       => 'hourly',
        'hire_date'       => '2026-02-01',
        'status'          => 'active',
    ]);

    Sanctum::actingAs($s['accountant']);
    $rows = collect($this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary")
        ->assertOk()->json('payload.data'))->keyBy('employee_id');

    expect($rows)->toHaveCount(3);

    // Null, not 0.00 — "not in this run" is a different fact from "worked
    // nothing this run", and a zero would assert the second.
    $newcomer = $rows['E-2000'];

    expect($newcomer['employee_type'])->toBe('part_time')
        ->and($newcomer['hours'])->toBeNull()
        ->and($newcomer['hours_breakdown'])->toBeNull()
        ->and($newcomer['gross_pay'])->toBeNull()
        ->and($newcomer['total_deduction'])->toBeNull();
});

it('totals every kind of hour into the hours column', function () {
    $s = payrollScenario();
    $run = startAndFillRun($s);

    $run->lines()->where('pay_basis', 'hourly')->first()->update([
        'regular_hours'      => 70,
        'overtime_hours'     => 5.5,
        'stat_holiday_hours' => 8,
        'vacation_hours'     => 4,
        'sick_hours'         => 2.5,
    ]);

    Sanctum::actingAs($s['accountant']);
    $rows = collect($this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary")
        ->assertOk()->json('payload.data'))->keyBy('employee_id');

    expect((float) $rows['E-1000']['hours'])->toBe(90.0)
        ->and((float) $rows['E-1000']['hours_breakdown']['overtime'])->toBe(5.5)
        ->and((float) $rows['E-1000']['hours_breakdown']['sick'])->toBe(2.5);
});

it('reads a named run rather than the latest', function () {
    $s = payrollScenario();
    $first = startAndFillRun($s);

    // A second, later run for the same firm with different hours. It needs a
    // period of its own — payroll_runs.payroll_period_id is unique, which is
    // the schema enforcing one run per pay period.
    $nextPeriod = Period::create([
        'firm_id'       => $s['firm']->id,
        'pay_frequency' => 'Bi-Weekly',
        'sequence'      => 2,
        'year'          => 2026,
        'period_start'  => '2026-01-19',
        'period_end'    => '2026-02-01',
        'pay_date'      => '2026-02-05',
        'cutoff_date'   => '2026-02-03',
        'status'        => 'open',
    ]);

    $second = Run::create([
        'firm_id'           => $s['firm']->id,
        'payroll_period_id' => $nextPeriod->id,
        'status'            => 'draft',
        'pay_frequency'     => 'Bi-Weekly',
    ]);
    \App\Helpers\Guid::generate('payroll_runs', 'guid', 'Run', $second->id);
    $second = $second->fresh();

    $employee = Employee::where('firm_id', $s['firm']->id)->where('employee_number', 'E-1000')->first();

    RunLine::create([
        'payroll_run_id'      => $second->id,
        'payroll_employee_id' => $employee->id,
        'employee_name'       => 'Later Run',
        'employee_number'     => 'E-1000',
        'pay_basis'           => 'hourly',
        'rate_type'           => 'hourly',
        'rate_amount'         => 28.00,
        'regular_hours'       => 10,
        'gross_amount'        => 280.00,
    ]);

    Sanctum::actingAs($s['accountant']);

    // Default: the latest run.
    $latest = collect($this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary")
        ->assertOk()->json('payload.data'))->keyBy('employee_id');

    expect((float) $latest['E-1000']['hours'])->toBe(10.0);

    // Named: the earlier one.
    $named = $this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary", [
        'run_guid' => $first->guid,
    ])->assertOk();

    expect($named->json('payload.meta.run.guid'))->toBe($first->guid)
        ->and((float) collect($named->json('payload.data'))->keyBy('employee_id')['E-1000']['hours'])->toBe(80.0);

    // An unknown run is an error, not a silent fallback to the latest.
    $this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary", ['run_guid' => 'NOSUCHRUN'])
        ->assertStatus(404)->assertJsonPath('message', 'RUN_NOT_FOUND');
});

it('lists the employees with null figures when the firm has never run payroll', function () {
    $s = payrollScenario();

    Sanctum::actingAs($s['accountant']);
    $response = $this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary")->assertOk();

    expect($response->json('payload.meta.run'))->toBeNull()
        ->and($response->json('payload.data'))->toHaveCount(2)
        ->and($response->json('payload.data.0.gross_pay'))->toBeNull()
        ->and($response->json('payload.data.0.employee_type'))->toBe('full_time');
});

it('filters and paginates the same way the employee master list does', function () {
    $s = payrollScenario();
    startAndFillRun($s);

    Sanctum::actingAs($s['accountant']);

    $searched = $this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary", [
        'search' => 'E-1001',
    ])->assertOk();

    expect($searched->json('payload.data'))->toHaveCount(1)
        ->and($searched->json('payload.data.0.employee_id'))->toBe('E-1001');

    $paged = $this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary", [
        'results_per_page' => 1, 'page' => 2,
    ])->assertOk();

    expect($paged->json('payload.data'))->toHaveCount(1)
        ->and($paged->json('payload.meta.total_results'))->toBe(2)
        ->and($paged->json('payload.meta.last_page'))->toBe(2);

    $this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary", ['status' => 'nonsense'])
        ->assertStatus(422);
});

it('reports payslip_pdf as null because no payslip storage exists yet', function () {
    $s = payrollScenario();
    startAndFillRun($s);

    Sanctum::actingAs($s['accountant']);
    $rows = $this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary")
        ->assertOk()->json('payload.data');

    // The key is present so the frontend contract is stable, but nothing can
    // populate it until the payslip phase is built.
    foreach ($rows as $row) {
        expect($row)->toHaveKey('payslip_pdf')
            ->and($row['payslip_pdf'])->toBeNull();
    }
});

it('denies a client of another firm', function () {
    $s = payrollScenario();
    $otherFirm = makeFirm(['payment_type' => 'Weekly']);

    Sanctum::actingAs(makeUser('Client', ['firm_id' => $otherFirm->id]));
    $this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary")->assertStatus(403);

    // The firm's own client may read it.
    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/{$s['firm']->guid}/employees/payroll-summary")->assertOk();
});
