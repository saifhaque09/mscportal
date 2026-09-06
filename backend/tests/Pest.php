<?php

use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Modules\Clients\Models\Firm;
use App\Modules\Organizations\Models\OrganizationRole;
use App\Modules\Organizations\Models\OrganizationUserAssignment;
use App\Modules\Payroll\Models\Agreement;
use App\Modules\Payroll\Models\Employee;
use App\Modules\Payroll\Models\EmployeeRate;
use App\Modules\Payroll\Models\Period;
use App\Modules\Payroll\Models\Run;
use App\Modules\Payroll\Models\Setting as PayrollSetting;
use Laravel\Sanctum\Sanctum;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(Tests\TestCase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/*
|--------------------------------------------------------------------------
| Security test helpers
|--------------------------------------------------------------------------
|
| Shared factories for the tests/Feature/Security suite. Kept here rather
| than model factories because most of these need a Spatie role or an
| Organizations assignment attached immediately, which plain factories
| don't express well.
|
*/

function makeUser(string $role, array $attrs = []): User
{
    static $n = 0;
    $n++;

    $user = User::create(array_merge([
        'guid' => strtoupper(substr($role, 0, 4)) . $n . random_int(1000, 9999),
        'first_name' => $role,
        'last_name' => 'Test' . $n,
        'email' => strtolower($role) . $n . random_int(1000, 9999) . '@test.example',
        'password' => bcrypt('password'),
        'status' => 'active',
    ], $attrs));

    $user->assignRole($role);

    return $user;
}

function makeFirm(array $attrs = []): Firm
{
    static $n = 0;
    $n++;

    return Firm::create(array_merge([
        'guid' => 'FIRM' . $n . random_int(1000, 9999),
        'firm_name' => 'Test Firm ' . $n,
    ], $attrs));
}

function assignOrgRole(User $user, Firm $firm, string $roleCode): OrganizationUserAssignment
{
    $role = OrganizationRole::where('code', $roleCode)->firstOrFail();

    return OrganizationUserAssignment::create([
        'firm_id' => $firm->id,
        'user_id' => $user->id,
        'organization_role_id' => $role->id,
    ]);
}

/** Sets the given user as the currently authenticated user for direct controller-level calls. */
function loginAs(User $user): User
{
    Auth::setUser($user);

    return $user;
}

/**
 * Reference data every Spatie/Organizations authorization check depends on.
 * Call from a per-file beforeEach() — e.g.:
 *
 *   uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
 *   beforeEach(fn () => seedAuthReferenceData());
 *
 * (Declared per-file rather than in a directory-scoped Pest.php: a
 * standalone beforeEach() in a subdirectory Pest.php was not reliably
 * picked up by this Pest version — see tests/Feature/Security/*Test.php.)
 */
function seedAuthReferenceData(): void
{
    // Spatie caches roles/permissions outside the DB transaction that wraps
    // each test; without clearing it here, a role seeded in this test can
    // collide with a stale (already-rolled-back) cache from the previous one.
    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

    test()->seed([
        \Database\Seeders\RolesSeeder::class,
        \Database\Seeders\PermissionSeeder::class,
        \Database\Seeders\OrganizationRoleSeeder::class,
        \Database\Seeders\OrganizationPermissionSeeder::class,
        \Database\Seeders\OrganizationRolePermissionSeeder::class,
        // Login.php reads settings('login', ...) unguarded in a couple of
        // spots (login_field_email_show/login_field_mobile_show) — without
        // this row present, those endpoints behave differently than in a
        // real deployment, where SettingsSeeder always provides it.
        \Database\Seeders\SettingsSeeder::class,
    ]);
}

/*
|--------------------------------------------------------------------------
| Payroll fixtures
|--------------------------------------------------------------------------
|
| Shared rather than file-local: a run scenario is wanted by every payroll
| suite that needs figures on a line, and Pest only loads the test file it is
| running, so a helper defined inside one test file is invisible to the others.
|
*/

/**
 * A firm with payroll active, two employees on rates, one open period, and a
 * client + accountant who can act on it.
 */
function payrollScenario(): array
{
    $firm = makeFirm(['payment_type' => 'Bi-Weekly']);

    PayrollSetting::create([
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

    foreach ([['hourly', 28.00], ['salary', 1500.00]] as $i => [$basis, $amount]) {
        $user = makeUser('Employee', ['firm_id' => $firm->id]);

        $employee = Employee::create([
            'firm_id'                   => $firm->id,
            'user_id'                   => $user->id,
            'employee_number'           => 'E-100' . $i,
            'employment_type'           => 'full_time',
            'pay_basis'                 => $basis,
            'hire_date'                 => '2024-01-01',
            'status'                    => 'active',
            'standard_hours_per_period' => 80,
        ]);

        EmployeeRate::create([
            'payroll_employee_id' => $employee->id,
            'rate_type'           => $basis === 'hourly' ? 'hourly' : 'per_period_salary',
            'amount'              => $amount,
            'effective_from'      => '2024-01-01',
        ]);
    }

    $client = makeUser('Client', ['firm_id' => $firm->id]);
    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $firm, 'lead_acc');

    return compact('firm', 'period', 'client', 'accountant');
}

/** Open a draft run and fill in valid hours, as the client. */
function startAndFillRun(array $scenario): Run
{
    Sanctum::actingAs($scenario['client']);

    $response = test()->postJson("/payroll/{$scenario['firm']->guid}/runs/start", [
        'payroll_period_id' => $scenario['period']->id,
    ])->assertOk();

    $run = Run::where('guid', $response->json('payload.guid'))->first();

    $lines = $run->lines()->get()->map(fn ($line) => [
        'id'            => $line->id,
        'regular_hours' => $line->pay_basis === 'hourly' ? 80 : 80,
    ])->all();

    test()->postJson("/payroll/runs/{$run->guid}/lines", ['lines' => $lines])->assertOk();

    return $run->fresh();
}
