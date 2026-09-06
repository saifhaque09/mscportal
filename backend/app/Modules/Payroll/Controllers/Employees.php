<?php

namespace App\Modules\Payroll\Controllers;

use App\Helpers\Guid;
use App\Http\Controllers\BaseController;
use App\Models\User;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Clients\Models\Firm;
use App\Modules\Clients\Models\Invite;
use App\Modules\Payroll\Models\Employee;
use App\Modules\Payroll\Models\EmployeeRate;
use App\Modules\Payroll\Models\Run;
use App\Modules\Payroll\Models\RunLine;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Validator;

/**
 * The client's payroll employee master.
 *
 * Every payroll employee is an existing portal login with the Employee role.
 * Name, email and SIN are never duplicated onto payroll_employees — they stay
 * on users / users.meta (encrypted). This table holds only the payroll facts.
 *
 * Because a login is required, someone with an unaccepted invite cannot be put
 * on payroll. eligible() surfaces that explicitly rather than leaving the
 * client to wonder why a colleague is missing from the list.
 */
class Employees extends BaseController
{
    private function firm(string $guid): ?Firm
    {
        return Firm::where('guid', $guid)->first();
    }

    /**
     * SIN is masked to the last three digits everywhere in payroll. Payroll has
     * no reason to ever show the full number, so unlike Users::view there is no
     * unmasked branch here at all.
     */
    private function publicUser(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        $sin = null;
        try {
            $meta = $user->meta;
            if (isset($meta['sin_number'])) {
                $sin = Str::mask($meta['sin_number'], '*', 0, -3);
            }
        } catch (DecryptException $e) {
            $sin = null;
        }

        return [
            'id'         => $user->id,
            'guid'       => $user->guid,
            'first_name' => $user->first_name,
            'last_name'  => $user->last_name,
            'email'      => $user->email,
            'mobile'     => $user->mobile,
            'status'     => $user->status,
            'sin_masked' => $sin,
        ];
    }

    private function present(Employee $employee): array
    {
        $data = $employee->toArray();
        $data['user'] = $this->publicUser($employee->user);
        $data['current_rate'] = $employee->rateOn(now()->toDateString());

        return $data;
    }

    /*
    |--------------------------------------------------------------------------
    | Listing
    |--------------------------------------------------------------------------
    */

    /**
     * The client's employees with their pay figures for one run: hours, gross
     * and deductions per person, alongside the master data.
     *
     * A separate endpoint from getAll() because the figures are NOT properties
     * of an employee — they live on payroll_run_lines and mean nothing without
     * a run to read them from. getAll() stays the master list.
     *
     * Every employee matching the filters is returned, including those with no
     * line in this run: their figures come back null rather than zero, because
     * "not in this run" and "worked nothing this run" are different facts and a
     * zero would assert the second.
     */
    public function payrollSummary(Request $request, string $guid = '')
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'run_guid'         => ['nullable', 'string'],
            'search'           => ['nullable', 'string'],
            'status'           => ['nullable', Rule::in(Config::get('payroll.employee_status'))],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $results_per_page = $validated['results_per_page'] ?? Config::get('payroll.filters.results_per_page');
        $page = $validated['page'] ?? Config::get('payroll.filters.page');

        // A named run, else the firm's most recent one. Cancelled runs are
        // excluded from the fallback so a cancelled run never masks the real
        // figures — the same rule Runs::queue() uses for latest_run. A cancelled
        // run can still be read by naming its guid.
        if (! empty($validated['run_guid'])) {
            $run = Run::where('firm_id', $firm->id)->where('guid', $validated['run_guid'])->with('period')->first();

            if (! $run) {
                return $this->sendError('RUN_NOT_FOUND', 404);
            }
        } else {
            $run = Run::where('firm_id', $firm->id)
                ->where('status', '!=', 'cancelled')
                ->orderByDesc('id')
                ->with('period')
                ->first();
        }

        $sql = $this->employeeQuery($firm, $validated);

        $total_results = $sql->count();
        $max = $total_results > 0 ? ceil($total_results / $results_per_page) : 1;
        $offset = (max(1, $page) - 1) * $results_per_page;

        $employees = $sql->with('user')
            ->orderBy('status')
            ->limit($results_per_page)
            ->offset($offset)
            ->get();

        // One query for the page's lines, not one per employee.
        $lines = $run
            ? RunLine::where('payroll_run_id', $run->id)
                ->whereIn('payroll_employee_id', $employees->pluck('id'))
                ->get()
                ->keyBy('payroll_employee_id')
            : collect();

        $data = $employees->map(function (Employee $employee) use ($lines) {
            $line = $lines->get($employee->id);

            return [
                'id'              => $employee->id,
                'guid'            => $employee->guid,
                // The human-facing payroll id the client assigns, which is what
                // a payroll table means by "employee id". The row id is above.
                'employee_id'     => $employee->employee_number,
                'employee_name'   => trim($employee->user?->first_name . ' ' . $employee->user?->last_name),
                'employee_type'   => $employee->employment_type,
                'pay_basis'       => $employee->pay_basis,
                'status'          => $employee->status,

                'hours'           => $line ? $this->totalHours($line) : null,
                'hours_breakdown' => $line ? [
                    'regular'      => $line->regular_hours,
                    'overtime'     => $line->overtime_hours,
                    'stat_holiday' => $line->stat_holiday_hours,
                    'vacation'     => $line->vacation_hours,
                    'sick'         => $line->sick_hours,
                ] : null,

                'gross_pay' => $line?->gross_amount,

                // What the client entered on the line, and nothing else. This
                // module never calculates payroll — CPP, EI and income tax are
                // the external system's job — so this is NOT a statutory
                // deduction total and net pay cannot be derived from it.
                'total_deduction' => $line?->deduction_amount,
                'deduction_label' => $line?->deduction_label,

                'line_status' => $line?->status,

                // Reserved. Nothing produces a payslip yet: the run status
                // 'payslips_uploaded' and payroll_runs.payslips_uploaded_at are
                // placeholders for a phase that was never wired up, there is no
                // payslip column on any table, and files.group has no 'payslip'
                // member. Always null until that exists.
                'payslip_pdf' => null,
            ];
        });

        return $this->sendResponse('RECORDS_FOUND', [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $max,
                'current_page'  => intval($page),
                'num_results'   => count($data),
                'total_results' => $total_results,
                // Which run the figures came from. Null when the firm has never
                // had a run, in which case every row's figures are null too.
                'run' => $run ? [
                    'guid'   => $run->guid,
                    'status' => $run->status,
                    'period' => $run->period,
                ] : null,
            ],
            'data' => $data,
        ]);
    }

    /** Every hour recorded on a line, which is what a payroll table shows as "hours". */
    private function totalHours(RunLine $line): string
    {
        return number_format(
            (float) $line->regular_hours
            + (float) $line->overtime_hours
            + (float) $line->stat_holiday_hours
            + (float) $line->vacation_hours
            + (float) $line->sick_hours,
            2, '.', ''
        );
    }

    /**
     * The employee list filters, shared by getAll() and payrollSummary() so the
     * two lists can never disagree about which employees a firm has.
     */
    private function employeeQuery(Firm $firm, array $validated)
    {
        $sql = Employee::where('firm_id', $firm->id);

        if (! empty($validated['status'])) {
            $sql = $sql->where('status', $validated['status']);
        }

        $search = trim((string) ($validated['search'] ?? ''));

        if ($search !== '') {
            // Name and email live on users, so the search has to reach through
            // the relation rather than filtering this table alone.
            $sql = $sql->where(function ($q) use ($search) {
                $q->where('employee_number', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%")
                    ->orWhere('job_title', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->whereAny(['first_name', 'last_name', 'email'], 'like', "%{$search}%");
                    });
            });
        }

        return $sql;
    }

    public function getAll(Request $request, string $guid = '')
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'search'           => ['nullable', 'string'],
            'status'           => ['nullable', Rule::in(Config::get('payroll.employee_status'))],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $results_per_page = $validated['results_per_page'] ?? Config::get('payroll.filters.results_per_page');
        $page = $validated['page'] ?? Config::get('payroll.filters.page');

        $sql = $this->employeeQuery($firm, $validated);

        $total_results = $sql->count();
        $max = $total_results > 0 ? ceil($total_results / $results_per_page) : 1;
        $offset = (max(1, $page) - 1) * $results_per_page;

        $records = $sql->with(['user', 'rates'])
            ->orderBy('status')
            ->limit($results_per_page)
            ->offset($offset)
            ->get()
            ->map(fn (Employee $e) => $this->present($e));

        return $this->sendResponse('RECORDS_FOUND', [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $max,
                'current_page'  => intval($page),
                'num_results'   => count($records),
                'total_results' => $total_results,
            ],
            'data' => $records,
        ]);
    }

    /**
     * Who can be added to payroll, and who cannot yet.
     *
     * A payroll employee must be an existing portal login, so this returns two
     * lists: firm users holding the Employee role who are not already on
     * payroll, and outstanding invites that must be accepted first. The second
     * list is the honest answer to "where is my colleague" — without it the
     * client just sees an absence.
     */
    public function eligible(Request $request, string $guid = '')
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $alreadyOnPayroll = Employee::where('firm_id', $firm->id)->pluck('user_id');

        $users = User::where('firm_id', $firm->id)
            ->role('Employee')
            ->whereNotIn('id', $alreadyOnPayroll)
            ->get()
            ->map(fn (User $u) => $this->publicUser($u));

        $pending = Invite::where('firm_id', $firm->id)
            ->where('role', 'Employee')
            ->get()
            ->map(fn (Invite $i) => [
                'email'      => $i->email,
                'first_name' => $i->first_name,
                'last_name'  => $i->last_name,
                'invited_at' => $i->created_at,
                'expires_at' => $i->expires_at,
                'selectable' => false,
                'reason'     => 'INVITE_NOT_ACCEPTED',
            ]);

        return $this->sendResponse('RECORDS_FOUND', [
            'users'           => $users,
            'pending_invites' => $pending,
        ]);
    }

    public function view(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $employee = Employee::where('firm_id', $firm->id)->where('id', $id)->with(['user', 'rates'])->first();
        if (! $employee) {
            return $this->sendError('PAYROLL_EMPLOYEE_NOT_FOUND', 404);
        }

        return $this->sendResponse('RECORD_FOUND', $this->present($employee));
    }

    /*
    |--------------------------------------------------------------------------
    | Writes
    |--------------------------------------------------------------------------
    */

    public function create(Request $request, string $guid = '')
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        // Client-writable, but platform Staff stays read-only regardless of the
        // org role they hold on this firm.
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'user_id'                   => ['required', 'integer', 'exists:users,id'],
            'employee_number'           => ['nullable', 'string', 'max:50'],
            'employment_type'           => ['required', Rule::in(Config::get('payroll.employment_types'))],
            'pay_basis'                 => ['required', Rule::in(Config::get('payroll.pay_bases'))],
            'department'                => ['nullable', 'string', 'max:100'],
            'job_title'                 => ['nullable', 'string', 'max:100'],
            'hire_date'                 => ['required', 'date', 'date_format:Y-m-d'],
            'province_of_employment'    => ['nullable', 'string', 'size:2'],
            'standard_hours_per_period' => ['nullable', 'numeric', 'min:0', 'max:9999'],
            'vacation_pay_percent'      => ['nullable', 'numeric', 'min:0', 'max:100'],
            'payment_method'            => ['nullable', Rule::in(Config::get('payroll.payment_methods'))],
            // The opening rate. Optional here so a profile can be created before
            // pay is agreed, but a run cannot be submitted without one.
            'rate_type'                 => ['nullable', Rule::in(Config::get('payroll.rate_types'))],
            'rate_amount'               => ['nullable', 'numeric', 'min:0'],
            'rate_effective_from'       => ['nullable', 'date', 'date_format:Y-m-d'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        $user = User::find($validated['user_id']);
        if (! $user || (int) $user->firm_id !== (int) $firm->id) {
            return $this->sendError('USER_NOT_IN_FIRM', 422);
        }
        if (! $user->hasRole('Employee')) {
            return $this->sendError('USER_NOT_AN_EMPLOYEE', 422);
        }
        if (Employee::where('firm_id', $firm->id)->where('user_id', $user->id)->exists()) {
            return $this->sendError('EMPLOYEE_ALREADY_ON_PAYROLL', 422);
        }
        if (! empty($validated['employee_number'])
            && Employee::where('firm_id', $firm->id)->where('employee_number', $validated['employee_number'])->exists()) {
            return $this->sendError('EMPLOYEE_NUMBER_IN_USE', 422);
        }

        $employee = DB::transaction(function () use ($firm, $user, $validated) {
            $employee = Employee::create([
                'firm_id'                   => $firm->id,
                'user_id'                   => $user->id,
                'employee_number'           => $validated['employee_number'] ?? null,
                'employment_type'           => $validated['employment_type'],
                'pay_basis'                 => $validated['pay_basis'],
                'department'                => $validated['department'] ?? null,
                'job_title'                 => $validated['job_title'] ?? null,
                'hire_date'                 => $validated['hire_date'],
                'status'                    => 'active',
                'province_of_employment'    => $validated['province_of_employment'] ?? null,
                'standard_hours_per_period' => $validated['standard_hours_per_period'] ?? null,
                'vacation_pay_percent'      => $validated['vacation_pay_percent'] ?? null,
                'payment_method'            => $validated['payment_method'] ?? 'direct_deposit',
            ]);

            Guid::generate('payroll_employees', 'guid', $user->first_name, $employee->id);

            if (! empty($validated['rate_type']) && isset($validated['rate_amount'])) {
                EmployeeRate::create([
                    'payroll_employee_id' => $employee->id,
                    'rate_type'           => $validated['rate_type'],
                    'amount'              => $validated['rate_amount'],
                    'effective_from'      => $validated['rate_effective_from'] ?? $validated['hire_date'],
                    'reason'              => 'Initial rate',
                    'created_by'          => auth()->id(),
                ]);
            }

            return $employee;
        });

        $employee = $employee->fresh(['user', 'rates']);

        ActivityLog::record('payroll', "added {$employee->displayName()} to payroll for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORD_CREATED', $this->present($employee));
    }

    public function edit(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $employee = Employee::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $employee) {
            return $this->sendError('PAYROLL_EMPLOYEE_NOT_FOUND', 404);
        }

        $validator = Validator::make($request->all(), [
            'employee_number'           => ['nullable', 'string', 'max:50'],
            'employment_type'           => ['nullable', Rule::in(Config::get('payroll.employment_types'))],
            'pay_basis'                 => ['nullable', Rule::in(Config::get('payroll.pay_bases'))],
            'department'                => ['nullable', 'string', 'max:100'],
            'job_title'                 => ['nullable', 'string', 'max:100'],
            'hire_date'                 => ['nullable', 'date', 'date_format:Y-m-d'],
            'province_of_employment'    => ['nullable', 'string', 'size:2'],
            'standard_hours_per_period' => ['nullable', 'numeric', 'min:0', 'max:9999'],
            'vacation_pay_percent'      => ['nullable', 'numeric', 'min:0', 'max:100'],
            'payment_method'            => ['nullable', Rule::in(Config::get('payroll.payment_methods'))],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        if (! empty($validated['employee_number'])
            && Employee::where('firm_id', $firm->id)
                ->where('employee_number', $validated['employee_number'])
                ->where('id', '!=', $employee->id)
                ->exists()) {
            return $this->sendError('EMPLOYEE_NUMBER_IN_USE', 422);
        }

        foreach ($validated as $field => $value) {
            $employee->{$field} = $value;
        }
        $employee->save();

        ActivityLog::record('payroll', "updated payroll employee {$employee->displayName()} for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORD_UPDATED', $this->present($employee->fresh(['user', 'rates'])));
    }

    /**
     * Terminate. A status change, never a delete — submitted runs reference
     * this row and must stay reproducible.
     */
    public function terminate(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $employee = Employee::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $employee) {
            return $this->sendError('PAYROLL_EMPLOYEE_NOT_FOUND', 404);
        }

        $validator = Validator::make($request->all(), [
            'termination_date'   => ['required', 'date', 'date_format:Y-m-d'],
            'termination_reason' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        $employee->status = 'terminated';
        $employee->termination_date = $validated['termination_date'];
        $employee->termination_reason = $validated['termination_reason'] ?? null;
        $employee->save();

        ActivityLog::record('payroll', "terminated payroll employee {$employee->displayName()} for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORD_UPDATED', $this->present($employee->fresh(['user', 'rates'])));
    }

    public function reactivate(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $employee = Employee::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $employee) {
            return $this->sendError('PAYROLL_EMPLOYEE_NOT_FOUND', 404);
        }

        $employee->status = 'active';
        $employee->termination_date = null;
        $employee->termination_reason = null;
        $employee->save();

        ActivityLog::record('payroll', "reactivated payroll employee {$employee->displayName()} for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORD_UPDATED', $this->present($employee->fresh(['user', 'rates'])));
    }

    /*
    |--------------------------------------------------------------------------
    | Rates
    |--------------------------------------------------------------------------
    */

    public function rates(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $employee = Employee::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $employee) {
            return $this->sendError('PAYROLL_EMPLOYEE_NOT_FOUND', 404);
        }

        return $this->sendResponse('RECORDS_FOUND', [
            'data' => $employee->rates()->orderByDesc('effective_from')->get(),
        ]);
    }

    /**
     * Record a rate change.
     *
     * Never mutates the existing row — it closes it off and inserts a new one,
     * so a run submitted last month still resolves to the rate that actually
     * applied then.
     */
    public function addRate(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $employee = Employee::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $employee) {
            return $this->sendError('PAYROLL_EMPLOYEE_NOT_FOUND', 404);
        }

        $validator = Validator::make($request->all(), [
            'rate_type'      => ['required', Rule::in(Config::get('payroll.rate_types'))],
            'amount'         => ['required', 'numeric', 'min:0'],
            'currency'       => ['nullable', 'string', 'size:3'],
            'effective_from' => ['required', 'date', 'date_format:Y-m-d'],
            'reason'         => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        if ($employee->rates()->whereDate('effective_from', $validated['effective_from'])->exists()) {
            return $this->sendError('RATE_ALREADY_EFFECTIVE_ON_DATE', 422);
        }

        $rate = DB::transaction(function () use ($employee, $validated) {
            $previous = $employee->rates()
                ->whereDate('effective_from', '<', $validated['effective_from'])
                ->whereNull('effective_to')
                ->orderByDesc('effective_from')
                ->first();

            if ($previous) {
                $previous->effective_to = date('Y-m-d', strtotime($validated['effective_from'] . ' -1 day'));
                $previous->save();
            }

            return EmployeeRate::create([
                'payroll_employee_id' => $employee->id,
                'rate_type'           => $validated['rate_type'],
                'amount'              => $validated['amount'],
                'currency'            => $validated['currency'] ?? 'CAD',
                'effective_from'      => $validated['effective_from'],
                'reason'              => $validated['reason'] ?? null,
                'created_by'          => auth()->id(),
            ]);
        });

        ActivityLog::record('payroll', "set a new pay rate for {$employee->displayName()} at {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORD_CREATED', $rate);
    }
}
