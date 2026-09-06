<?php

namespace App\Modules\Payroll\Controllers;

use App\Helpers\Guid;
use App\Http\Controllers\BaseController;
use App\Models\User;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Clients\Models\Firm;
use App\Modules\Notifications\Models\Notification;
use App\Modules\Organizations\Models\OrganizationUserAssignment;
use App\Modules\Payroll\Models\Agreement;
use App\Modules\Payroll\Models\Employee;
use App\Modules\Payroll\Models\Period;
use App\Modules\Payroll\Models\ReviewItem;
use App\Modules\Payroll\Models\Run;
use App\Modules\Payroll\Models\RunEvent;
use App\Modules\Payroll\Models\RunLine;
use App\Modules\Payroll\Models\Setting;
use App\Services\OrganizationDeadlineService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Validator;

/**
 * Payroll runs: entry, validation, submission, and the accountant review loop.
 *
 * Status legality lives on Run::TRANSITIONS. What lives here instead are the
 * business preconditions that are not pure status — the agreement being
 * active, open change requests, invalid lines — because each needs its own
 * message code, and the error contract in this codebase is one code per
 * failure rather than a generic 422.
 */
class Runs extends BaseController
{
    /** Only the queue uses this — for the payroll date implied by the firm record. */
    public function __construct(private OrganizationDeadlineService $deadlines) {}

    private function firm(string $guid): ?Firm
    {
        return Firm::where('guid', $guid)->first();
    }

    private function run(string $runGuid): ?Run
    {
        return Run::where('guid', $runGuid)->with('firm')->first();
    }

    private function settingsFor(Firm $firm): Setting
    {
        return Setting::firstOrCreate(
            ['firm_id' => $firm->id],
            ['status' => 'Not Started', 'pay_frequency' => $firm->payment_type]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Listing
    |--------------------------------------------------------------------------
    */

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
            'status'           => ['nullable', Rule::in(Config::get('payroll.run_status'))],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $results_per_page = $validated['results_per_page'] ?? Config::get('payroll.filters.results_per_page');
        $page = $validated['page'] ?? Config::get('payroll.filters.page');

        $sql = Run::where('firm_id', $firm->id);
        if (! empty($validated['status'])) {
            $sql = $sql->where('status', $validated['status']);
        }
        $sql = $sql->orderByDesc('id');

        $total_results = $sql->count();
        $max = $total_results > 0 ? ceil($total_results / $results_per_page) : 1;
        $offset = (max(1, $page) - 1) * $results_per_page;

        $records = $sql->with(['period', 'submittedBy', 'reviewedBy'])
            ->limit($results_per_page)->offset($offset)->get();

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
     * The accountant's payroll client list — the only payroll route not scoped
     * by a firm guid, so it scopes itself.
     *
     * Rows are client firms, not runs. A firm with no payroll at all still has
     * to appear here: this list is where the accountant picks the client they
     * are about to raise the first agreement for, so filtering to firms that
     * already have a submitted run would hide exactly the firms that need
     * action. Each row therefore carries its own payroll state (settings
     * status, current agreement, latest run, outstanding counts) and the
     * frontend decides between "Set up payroll" and "Review run" from that.
     *
     * `bucket` narrows the same client list rather than changing what a row is:
     * the run buckets keep only firms holding a run in those statuses, so the
     * review inbox is this endpoint with bucket=review.
     */
    public function queue(Request $request)
    {
        $user = auth()->user();

        if (! $this->isFirmStaff('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'bucket'           => ['nullable', Rule::in(['all', 'not_setup', 'active', 'review', 'ready', 'processed'])],
            'search'           => ['nullable', 'string'],
            'payment_type'     => ['nullable', Rule::in(Config::get('payroll.pay_frequencies'))],
            'payroll_status'   => ['nullable', Rule::in(Config::get('payroll.settings_status'))],
            'agreement_status' => ['nullable', Rule::in(Config::get('payroll.agreement_status'))],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $bucket = $validated['bucket'] ?? 'all';
        $search = $validated['search'] ?? Config::get('payroll.filters.search');
        $paymentType = $validated['payment_type'] ?? '';
        $payrollStatus = $validated['payroll_status'] ?? '';
        $agreementStatus = $validated['agreement_status'] ?? '';
        $results_per_page = $validated['results_per_page'] ?? Config::get('payroll.filters.results_per_page');
        $page = $validated['page'] ?? Config::get('payroll.filters.page');

        // Same search columns as Firms::getAll(), and wrapped in its own
        // where() group for the same reason — the ACL filters below are ANDed
        // on afterwards and must not be escaped by an OR branch.
        $sql = Firm::query();
        if ($search !== '') {
            $sql = $sql->where(function ($q) use ($search) {
                $q->whereAny(['firm_name', 'contact_email', 'contact_mobile', 'city'], 'like', "%$search%");
            });
        }

        // Admin sees every firm; other staff see only the firms they are
        // actually assigned to, and only once those are out of draft — the
        // same scope rule as Firms::getAll().
        if (! $user->hasRole('Admin')) {
            $sql = $sql->whereIn('id', $this->myAssignedFirmIds())->where('status', 'active');
        }

        // Bucket filters are expressed as firm-id sets pulled from the payroll
        // tables rather than whereHas() on Firm, so the Clients module's model
        // needs no payroll relations for payroll's own listing to work.
        $runBucketStatuses = match ($bucket) {
            'review'    => ['submitted', 'in_review', 'resubmitted', 'client_update_required'],
            'ready'     => ['ready_to_process'],
            'processed' => ['processing', 'payslips_uploaded', 'processed'],
            default     => null,
        };

        if ($runBucketStatuses !== null) {
            $sql = $sql->whereIn('id', Run::whereIn('status', $runBucketStatuses)->distinct()->pluck('firm_id'));
        } elseif ($bucket === 'active') {
            $sql = $sql->whereIn('id', Agreement::where('status', 'Agreed')->distinct()->pluck('firm_id'));
        } elseif ($bucket === 'not_setup') {
            $sql = $sql->whereNotIn('id', Agreement::where('status', 'Agreed')->distinct()->pluck('firm_id'));
        }

        // Payroll frequency. It lives on the firm record — payroll snapshots it
        // onto the agreement and settings, but never defines its own.
        if ($paymentType !== '') {
            $sql = $sql->where('payment_type', $paymentType);
        }

        // The two status filters have to match what the row actually reports,
        // and a row reports the column default when it has no underlying row at
        // all. So filtering on the default value must also catch the firms with
        // nothing stored, or the commonest case on a fresh install — every firm
        // reading 'Not Started' / 'Pending' — would return nothing.
        if ($payrollStatus !== '') {
            $matching = Setting::where('status', $payrollStatus)->pluck('firm_id');

            if ($payrollStatus === 'Not Started') {
                $withSettings = Setting::distinct()->pluck('firm_id');
                $sql = $sql->where(function ($q) use ($matching, $withSettings) {
                    $q->whereIn('id', $matching)->orWhereNotIn('id', $withSettings);
                });
            } else {
                $sql = $sql->whereIn('id', $matching);
            }
        }

        if ($agreementStatus !== '') {
            // The row shows the LATEST agreement's status, so the filter has to
            // look at the latest one too — not at any agreement the firm ever had.
            $latestPerFirm = Agreement::selectRaw('MAX(id) as id')->groupBy('firm_id')->pluck('id');
            $matching = Agreement::whereIn('id', $latestPerFirm)
                ->where('status', $agreementStatus)
                ->pluck('firm_id');

            // 'Pending' is the no-agreement value, so filtering on it means
            // "firms with nothing raised" — it can never match a stored row.
            if ($agreementStatus === 'Pending') {
                $withAgreement = Agreement::distinct()->pluck('firm_id');
                $sql = $sql->where(function ($q) use ($matching, $withAgreement) {
                    $q->whereIn('id', $matching)->orWhereNotIn('id', $withAgreement);
                });
            } else {
                $sql = $sql->whereIn('id', $matching);
            }
        }

        // Alphabetical: this is a client directory first and an inbox second,
        // and the per-row counts below are what flags the ones needing work.
        $sql = $sql->orderBy('firm_name');

        $total_results = $sql->count();
        $max = $total_results > 0 ? ceil($total_results / $results_per_page) : 1;
        $offset = (max(1, $page) - 1) * $results_per_page;

        $records = $sql->limit($results_per_page)->offset($offset)->get();

        $firmIds = $records->pluck('id')->all();

        // Everything below is batched over the whole page — one query per
        // source table, never one per firm.
        $settings = Setting::whereIn('firm_id', $firmIds)->get()->keyBy('firm_id');

        // The firm's latest agreement, whatever its status. keyBy() keeps the
        // LAST row for a repeated key, so ordering by id ascending makes the
        // newest win. Deliberately NOT filtered to Agreement::LIVE: a firm whose
        // most recent agreement was declined has to read as 'Reject', not fall
        // through to the 'Pending' default as though none had ever been raised.
        $agreements = Agreement::whereIn('firm_id', $firmIds)
            ->orderBy('id')
            ->get()
            ->keyBy('firm_id');

        // Latest run per firm, same keyBy() rule. Cancelled runs are excluded
        // so a cancelled run never masks the real state of the payroll.
        $latestRuns = Run::whereIn('firm_id', $firmIds)
            ->where('status', '!=', 'cancelled')
            ->orderBy('id')
            ->with('period')
            ->get()
            ->keyBy('firm_id');

        // The firm's own payroll headcount, not a run's. Counted on 'active'
        // because that is exactly the set Runs::start() seeds a run's lines
        // from, so this is the number of employees the next payroll will cover
        // — on_leave and terminated employees are excluded.
        $employeeCounts = Employee::whereIn('firm_id', $firmIds)
            ->where('status', 'active')
            ->selectRaw('firm_id, COUNT(*) as aggregate')
            ->groupBy('firm_id')
            ->pluck('aggregate', 'firm_id');

        // Last pay date actually paid out. Approval to 'ready_to_process' is the
        // point the payroll leaves this module for the external payroll system,
        // so it is what counts as paid — the run statuses beyond it belong to
        // the payslip phase, which is not wired up here.
        $lastPaymentDates = Period::join('payroll_runs', 'payroll_runs.payroll_period_id', '=', 'payroll_periods.id')
            ->whereIn('payroll_periods.firm_id', $firmIds)
            ->whereIn('payroll_runs.status', ['ready_to_process', 'processing', 'payslips_uploaded', 'processed'])
            ->selectRaw('payroll_periods.firm_id as firm_id, MAX(payroll_periods.pay_date) as aggregate')
            ->groupBy('payroll_periods.firm_id')
            ->pluck('aggregate', 'firm_id');

        // Next scheduled pay date, where the firm has a generated calendar. One
        // query for the page; firms without one fall back to the firm record's
        // own arithmetic in the loop below, which costs no query at all.
        // pluck() keeps the LAST row for a repeated key, so ordering pay_date
        // DESCENDING makes the EARLIEST upcoming date win — that is the next one
        // due, not the furthest away.
        $nextPayDates = Period::whereIn('firm_id', $firmIds)
            ->whereDate('pay_date', '>=', now()->toDateString())
            ->where('status', '!=', 'skipped')
            ->orderByDesc('pay_date')
            ->pluck('pay_date', 'firm_id');

        $awaitingCounts = Run::whereIn('firm_id', $firmIds)
            ->whereIn('status', ['submitted', 'in_review', 'resubmitted'])
            ->selectRaw('firm_id, COUNT(*) as aggregate')
            ->groupBy('firm_id')
            ->pluck('aggregate', 'firm_id');

        // 'addressed' counts as outstanding: the client has replied but the
        // accountant has not closed the query off yet.
        $openItemCounts = ReviewItem::join('payroll_runs', 'payroll_runs.id', '=', 'payroll_review_items.payroll_run_id')
            ->whereIn('payroll_runs.firm_id', $firmIds)
            ->whereIn('payroll_review_items.status', ['open', 'addressed'])
            ->selectRaw('payroll_runs.firm_id as firm_id, COUNT(*) as aggregate')
            ->groupBy('payroll_runs.firm_id')
            ->pluck('aggregate', 'firm_id');

        foreach ($records as $firm) {
            $setting   = $settings[$firm->id] ?? null;
            $agreement = $agreements[$firm->id] ?? null;
            $run       = $latestRuns[$firm->id] ?? null;

            // No payroll_settings row means payroll was never touched for this
            // firm. It reports the column's own default rather than being
            // created on read — a listing must not write — so a firm with no row
            // and a firm with a fresh row read identically.
            $firm->payroll_status = $setting?->status ?? 'Not Started';

            // Read off the agreement already loaded above rather than calling
            // Setting::isActive(), which would fire one query per row.
            $firm->payroll_active = (bool) $agreement?->isAgreed();
            $firm->payroll_settings = $setting;

            $firm->current_agreement = $agreement;

            // Present on every row, including firms that have no agreement row
            // at all, so the frontend can bind to it unconditionally.
            //
            // 'Pending' here means "none raised yet" and nothing else. A saved
            // agreement reports 'Draft', which is the whole point of that value
            // existing — this used to be one word for both, leaving the client
            // to tell them apart by checking current_agreement for null.
            $firm->agreement_status = $agreement?->status ?? 'Pending';

            // The one action this list exists to enable. A firm whose latest
            // agreement is finished (Inactive) or was declined (Reject) can
            // start a fresh one; one still in play cannot.
            $firm->can_create_agreement = $agreement === null
                || ! in_array($agreement->status, Agreement::LIVE, true);

            $firm->latest_run = $run;

            // Distinct from $firm->latest_run->employee_count, which is how many
            // lines that one run actually carried.
            $firm->employee_count = (int) ($employeeCounts[$firm->id] ?? 0);

            // 'NA' rather than null: these two are display strings the client
            // list binds to unconditionally, and no payroll has ever been paid
            // for most firms.
            $firm->last_payment_date = isset($lastPaymentDates[$firm->id])
                ? Carbon::parse($lastPaymentDates[$firm->id])->toDateString()
                : 'NA';

            // The generated payroll calendar wins where it exists; otherwise the
            // date implied by the firm record's payment_type, which is what
            // firms not yet on the payroll module have to go on.
            $due = $nextPayDates[$firm->id] ?? $this->deadlines->payrollDateFromFirmRecord($firm);
            $firm->payroll_due_date = $due ? Carbon::parse($due)->toDateString() : 'NA';

            $firm->runs_awaiting_review = (int) ($awaitingCounts[$firm->id] ?? 0);
            $firm->open_review_items = (int) ($openItemCounts[$firm->id] ?? 0);
        }

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

    public function view(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmScope($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $run->load(['period', 'lines.employee.user', 'reviewItems.raisedBy', 'submittedBy', 'reviewedBy', 'approvedBy']);

        return $this->sendResponse('RECORD_FOUND', [
            'run'      => $run,
            'previous' => $this->previousRunFor($run),
            'issues'   => $this->collectRunIssues($run),
        ]);
    }

    public function events(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmScope($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        return $this->sendResponse('RECORDS_FOUND', [
            'data' => $run->events()->with('actor')->orderByDesc('id')->get(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Client entry
    |--------------------------------------------------------------------------
    */

    /**
     * Open the run for a period, pre-filled with every active employee at the
     * rate in force on that period's pay date.
     */
    public function start(Request $request, string $guid = '')
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $settings = $this->settingsFor($firm);
        if (! $settings->isActive()) {
            return $this->sendError('PAYROLL_AGREEMENT_NOT_ACTIVE', 422);
        }

        $validator = Validator::make($request->all(), [
            'payroll_period_id' => ['required', 'integer'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        $period = Period::where('firm_id', $firm->id)->where('id', $validated['payroll_period_id'])->first();
        if (! $period) {
            return $this->sendError('PAYROLL_PERIOD_NOT_FOUND', 404);
        }
        if ($period->status === 'skipped') {
            return $this->sendError('PAYROLL_PERIOD_SKIPPED', 422);
        }

        // One run per period, enforced by a unique index as well as this check.
        $existing = Run::where('payroll_period_id', $period->id)->first();
        if ($existing) {
            return $this->sendResponse('RECORD_FOUND', $existing->load(['period', 'lines']));
        }

        $run = DB::transaction(function () use ($firm, $period) {
            $run = Run::create([
                'firm_id'           => $firm->id,
                'payroll_period_id' => $period->id,
                'status'            => 'draft',
                'version'           => 1,
            ]);

            Guid::generate('payroll_runs', 'guid', $firm->firm_name, $run->id);
            $run = $run->fresh();

            $employees = Employee::where('firm_id', $firm->id)
                ->where('status', 'active')
                ->with('user')
                ->get();

            foreach ($employees as $employee) {
                // An employee terminated before this period ended does not
                // belong on it at all.
                if ($employee->termination_date && $employee->termination_date->lt($period->period_end)) {
                    continue;
                }

                $rate = $employee->rateOn($period->pay_date);

                RunLine::create([
                    'payroll_run_id'           => $run->id,
                    'payroll_employee_id'      => $employee->id,
                    'employee_number'          => $employee->employee_number,
                    'employee_name'            => $employee->displayName(),
                    'pay_basis'                => $employee->pay_basis,
                    'rate_type'                => $rate->rate_type ?? ($employee->pay_basis === 'hourly' ? 'hourly' : 'per_period_salary'),
                    'rate_amount'              => $rate->amount ?? 0,
                    'payroll_employee_rate_id' => $rate->id ?? null,
                    // Salary lines pre-fill with the standard hours; hourly
                    // lines start empty, because that is the number the client
                    // is actually here to enter.
                    'regular_hours'            => $employee->pay_basis === 'salary' ? ($employee->standard_hours_per_period ?? 0) : 0,
                    'salary_amount'            => $employee->pay_basis === 'salary' ? ($rate->amount ?? 0) : 0,
                ]);
            }

            // Opening a run is not a transition — there is no from-status, and
            // draft->draft is deliberately not a legal edge — so the event is
            // written directly rather than through applyTransition(), which
            // would refuse it and leave the trail starting at "submitted".
            $actor = auth()->user();
            RunEvent::create([
                'payroll_run_id' => $run->id,
                'from_status'    => null,
                'to_status'      => 'draft',
                'action'         => 'created',
                'actor_id'       => $actor?->id,
                'actor_role'     => $actor?->getRoleNames()->first(),
                'meta'           => ['period_id' => $period->id],
                'created_at'     => now(),
            ]);

            $run->recalculateTotals();

            $period->status = 'open';
            $period->save();

            return $run;
        });

        ActivityLog::record('payroll', "started payroll for {$firm->firm_name} covering {$period->period_start} to {$period->period_end}", null, auth()->id());

        return $this->sendResponse('RECORD_CREATED', $run->fresh(['period', 'lines']));
    }

    /**
     * Bulk upsert of the entry grid.
     *
     * gross_amount is recomputed here from the line's own fields; whatever the
     * client sends for it is discarded. Rates and names are not re-read from
     * the employee record either — they were snapshotted when the line was
     * created, and a mid-period raise must not silently change a run.
     */
    public function saveLines(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmScope($run->firm_id, 'firms.manage', 'manage_payroll', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }
        if (! $run->isClientEditable()) {
            return $this->sendError('PAYROLL_RUN_LOCKED', 422);
        }

        $numericFields = Config::get('payroll.line_numeric_fields');

        $rules = [
            'lines'              => ['required', 'array', 'min:1'],
            'lines.*.id'         => ['required', 'integer'],
            'lines.*.note'       => ['nullable', 'string', 'max:1000'],
            'lines.*.other_earnings_label' => ['nullable', 'string', 'max:100'],
            'lines.*.deduction_label'      => ['nullable', 'string', 'max:100'],
            'client_note'        => ['nullable', 'string', 'max:2000'],
        ];
        foreach ($numericFields as $field) {
            $rules["lines.*.{$field}"] = ['nullable', 'numeric', 'min:0'];
        }

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        DB::transaction(function () use ($run, $validated, $numericFields) {
            foreach ($validated['lines'] as $payload) {
                $line = RunLine::where('payroll_run_id', $run->id)->where('id', $payload['id'])->first();
                if (! $line) {
                    continue;
                }

                foreach ($numericFields as $field) {
                    if (array_key_exists($field, $payload)) {
                        $line->{$field} = $payload[$field] ?? 0;
                    }
                }
                foreach (['note', 'other_earnings_label', 'deduction_label'] as $field) {
                    if (array_key_exists($field, $payload)) {
                        $line->{$field} = $payload[$field];
                    }
                }

                $line->gross_amount = $line->computeGross();
                $line->save();
            }

            if (array_key_exists('client_note', $validated)) {
                $run->client_note = $validated['client_note'];
                $run->save();
            }

            $run->recalculateTotals();
        });

        return $this->sendResponse('RECORD_UPDATED', $run->fresh(['period', 'lines']));
    }

    /** Dry run: the same rule set submit() enforces, without changing anything. */
    public function validateRun(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmScope($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        return $this->sendResponse('VALIDATION_COMPLETE', $this->collectRunIssues($run));
    }

    public function submit(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmScope($run->firm_id, 'firms.manage', 'manage_payroll', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $settings = $this->settingsFor($run->firm);
        if (! $settings->isActive()) {
            return $this->sendError('PAYROLL_AGREEMENT_NOT_ACTIVE', 422);
        }

        $isResubmission = $run->status === 'client_update_required';
        $target = $isResubmission ? 'resubmitted' : 'submitted';

        if (! $run->canTransitionTo($target)) {
            return $this->sendError('INVALID_STATUS_TRANSITION', 422);
        }

        // A resubmission that has not answered the accountant is not a
        // resubmission, it is the same payroll again.
        if ($isResubmission && $run->hasOpenChangeRequests()) {
            return $this->sendError('RUN_HAS_OPEN_CHANGE_REQUESTS', 422);
        }

        $issues = $this->collectRunIssues($run);
        if (! empty($issues['errors'])) {
            return $this->sendError('RUN_HAS_INVALID_LINES', 422);
        }

        DB::transaction(function () use ($run, $target, $isResubmission) {
            $run->applyTransition(
                $target,
                $isResubmission ? 'resubmitted' : 'submitted',
                null,
                ['employee_count' => $run->employee_count, 'total_gross' => $run->total_gross]
            );

            // Progress indicator on the firm: the payroll for this cycle is now
            // with the accountant. Read by the accountant's client list.
            $settings = $this->settingsFor($run->firm);
            $settings->status = 'Submitted';
            $settings->save();

            $period = $run->period;
            $this->notifyFirmStaff(
                $run->firm,
                $isResubmission ? 'Payroll resubmitted' : 'Payroll submitted',
                "{$run->firm->firm_name} " . ($isResubmission ? 'resubmitted' : 'submitted') .
                " payroll for {$period->period_start} to {$period->period_end} ({$run->employee_count} employees).",
                $isResubmission ? 'payroll_resubmitted' : 'payroll_submitted',
                $run->id
            );
        });

        ActivityLog::record('payroll', ($isResubmission ? 'resubmitted' : 'submitted') . " payroll for {$run->firm->firm_name}", null, auth()->id());

        return $this->sendResponse('PAYROLL_SUBMITTED', $run->fresh(['period', 'lines']));
    }

    /*
    |--------------------------------------------------------------------------
    | Accountant review
    |--------------------------------------------------------------------------
    */

    /** Claim the run, so two accountants cannot work the same payroll. */
    public function startReview(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmManageAction($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }
        if (! $run->canTransitionTo('in_review')) {
            return $this->sendError('INVALID_STATUS_TRANSITION', 422);
        }

        $run->applyTransition('in_review', 'review_started');

        ActivityLog::record('payroll', "claimed payroll review for {$run->firm->firm_name}", null, auth()->id());

        return $this->sendResponse('REVIEW_STARTED', $run->fresh(['period']));
    }

    /**
     * Raise change requests and send the run back. Items arrive as a batch so
     * the client gets one notification and one round, not one per query.
     */
    public function requestChanges(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmManageAction($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }
        if (! $run->canTransitionTo('client_update_required')) {
            return $this->sendError('INVALID_STATUS_TRANSITION', 422);
        }

        $validator = Validator::make($request->all(), [
            'items'                        => ['required', 'array', 'min:1'],
            'items.*.payroll_run_line_id'  => ['nullable', 'integer'],
            'items.*.field'                => ['nullable', 'string', 'max:60'],
            'items.*.severity'             => ['nullable', Rule::in(Config::get('payroll.review_severity'))],
            'items.*.comment'              => ['required', 'string', 'max:2000'],
            'accountant_note'              => ['nullable', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $round = (int) $run->version;

        DB::transaction(function () use ($run, $validated, $round) {
            foreach ($validated['items'] as $item) {
                // A line id from another run must never attach here.
                $lineId = $item['payroll_run_line_id'] ?? null;
                if ($lineId && ! RunLine::where('payroll_run_id', $run->id)->where('id', $lineId)->exists()) {
                    $lineId = null;
                }

                ReviewItem::create([
                    'payroll_run_id'      => $run->id,
                    'payroll_run_line_id' => $lineId,
                    'field'               => $item['field'] ?? null,
                    'severity'            => $item['severity'] ?? 'change_required',
                    'status'              => 'open',
                    'comment'             => $item['comment'],
                    'raised_by'           => auth()->id(),
                    'raised_at'           => now(),
                    'round'               => $round,
                ]);
            }

            if (! empty($validated['accountant_note'])) {
                $run->accountant_note = $validated['accountant_note'];
                $run->save();
            }

            $count = count($validated['items']);
            $run->applyTransition('client_update_required', 'changes_requested', null, ['item_count' => $count]);

            $period = $run->period;
            $this->notifyFirmClients(
                $run->firm,
                'Payroll update required',
                "Your accountant has {$count} question(s) about the payroll covering {$period->period_start} to {$period->period_end}.",
                'payroll_update_required',
                $run->id
            );
        });

        ActivityLog::record('payroll', "requested changes on payroll for {$run->firm->firm_name}", null, auth()->id());

        return $this->sendResponse('CHANGES_REQUESTED', $run->fresh(['period', 'reviewItems']));
    }

    public function approve(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmManageAction($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }
        if (! $run->canTransitionTo('ready_to_process')) {
            return $this->sendError('INVALID_STATUS_TRANSITION', 422);
        }
        if ($run->hasOpenChangeRequests()) {
            return $this->sendError('RUN_HAS_OPEN_CHANGE_REQUESTS', 422);
        }

        $issues = $this->collectRunIssues($run);
        if (! empty($issues['errors'])) {
            return $this->sendError('RUN_HAS_INVALID_LINES', 422);
        }

        DB::transaction(function () use ($run) {
            $run->applyTransition('ready_to_process', 'approved', null, [
                'employee_count' => $run->employee_count,
                'total_gross'    => $run->total_gross,
            ]);

            $period = $run->period;
            $period->status = 'closed';
            $period->save();

            // Approval is as far as this module takes a run — the payslip phase
            // lives in the external payroll system — so 'Processed' is stamped
            // here rather than on the unreachable 'processed' run status.
            $settings = $this->settingsFor($run->firm);
            $settings->status = 'Processed';
            $settings->save();

            $this->notifyFirmClients(
                $run->firm,
                'Payroll approved',
                "Your payroll for {$period->period_start} to {$period->period_end} has been approved and is ready for processing.",
                'payroll_approved',
                $run->id
            );
        });

        ActivityLog::record('payroll', "approved payroll for {$run->firm->firm_name}", null, auth()->id());

        return $this->sendResponse('PAYROLL_APPROVED', $run->fresh(['period']));
    }

    /** Send an approved run back to the client for correction. */
    public function reopen(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmManageAction($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }
        if (! $run->canTransitionTo('draft')) {
            return $this->sendError('INVALID_STATUS_TRANSITION', 422);
        }

        $validator = Validator::make($request->all(), [
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $reason = $validator->validated()['reason'];

        DB::transaction(function () use ($run, $reason) {
            $run->applyTransition('draft', 'reopened', $reason);

            $period = $run->period;
            $period->status = 'open';
            $period->save();

            $this->notifyFirmClients(
                $run->firm,
                'Payroll reopened',
                "Your payroll for {$period->period_start} to {$period->period_end} has been reopened for correction. Reason: {$reason}",
                'payroll_reopened',
                $run->id
            );
        });

        ActivityLog::record('payroll', "reopened payroll for {$run->firm->firm_name}", null, auth()->id());

        return $this->sendResponse('PAYROLL_REOPENED', $run->fresh(['period']));
    }

    public function cancel(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmManageAction($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }
        if (! $run->canTransitionTo('cancelled')) {
            return $this->sendError('INVALID_STATUS_TRANSITION', 422);
        }

        $validator = Validator::make($request->all(), [
            'reason' => ['required', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $reason = $validator->validated()['reason'];

        DB::transaction(function () use ($run, $reason) {
            $run->cancellation_reason = $reason;
            $run->save();
            $run->applyTransition('cancelled', 'cancelled', $reason);

            // The period reopens so a fresh run can be started for it.
            $period = $run->period;
            $period->status = 'open';
            $period->save();
        });

        ActivityLog::record('payroll', "cancelled payroll for {$run->firm->firm_name}", null, auth()->id());

        return $this->sendResponse('PAYROLL_CANCELLED', $run->fresh(['period']));
    }

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    /**
     * Cross-row business validation.
     *
     * One implementation, two callers: validateRun() returns it as a 200 so the
     * client can show a pre-flight panel, submit() blocks on a non-empty
     * errors array. Errors block; warnings never do — they surface on the
     * accountant's review screen instead.
     *
     * Deliberately a private method rather than a service or a FormRequest:
     * this codebase has neither, and the rules belong next to the endpoints
     * that enforce them.
     */
    private function collectRunIssues(Run $run): array
    {
        $errors = [];
        $warnings = [];

        $period = $run->period;
        $settings = Setting::where('firm_id', $run->firm_id)->first();
        $thresholds = Config::get('payroll.thresholds');

        $add = function (array &$bucket, string $code, string $message, ?RunLine $line = null) {
            $bucket[] = [
                'code'          => $code,
                'message'       => $message,
                'line_id'       => $line->id ?? null,
                'employee_name' => $line->employee_name ?? null,
            ];
        };

        if (! $settings || ! $settings->isActive()) {
            $add($errors, 'PAYROLL_AGREEMENT_NOT_ACTIVE', 'Payroll is not active for this client.');
        }

        $lines = $run->lines()->with('employee')->get();

        if ($lines->isEmpty()) {
            $add($errors, 'NO_EMPLOYEE_LINES', 'This payroll has no employees on it.');
        }

        $previous = $this->previousRunFor($run);

        foreach ($lines as $line) {
            if ($line->status === 'excluded') {
                continue;
            }

            $employee = $line->employee;

            if ((float) $line->rate_amount <= 0) {
                $add($errors, 'MISSING_PAY_RATE', "{$line->employee_name} has no rate of pay set.", $line);
            }

            if ($line->pay_basis === 'hourly'
                && $line->totalHours() <= 0
                && (float) $line->salary_amount <= 0) {
                $add($errors, 'MISSING_HOURS', "{$line->employee_name} is hourly but has no hours entered.", $line);
            }

            if ($line->pay_basis === 'salary' && (float) $line->salary_amount <= 0) {
                $add($errors, 'MISSING_SALARY_AMOUNT', "{$line->employee_name} is salaried but has no salary amount.", $line);
            }

            if ($employee && $period) {
                if ($employee->termination_date && $employee->termination_date->lt($period->period_end)) {
                    $add($errors, 'INACTIVE_EMPLOYEE_INCLUDED', "{$line->employee_name} was terminated before the end of this period.", $line);
                }
                if ($employee->hire_date && $employee->hire_date->gt($period->period_end)) {
                    $add($errors, 'EMPLOYEE_HIRED_AFTER_PERIOD', "{$line->employee_name} was hired after this period ended.", $line);
                }
            }

            if ((float) $line->other_earnings_amount > 0 && ! trim((string) $line->other_earnings_label)) {
                $add($errors, 'OTHER_AMOUNT_WITHOUT_LABEL', "{$line->employee_name} has other earnings with no description.", $line);
            }
            if ((float) $line->deduction_amount > 0 && ! trim((string) $line->deduction_label)) {
                $add($errors, 'DEDUCTION_WITHOUT_LABEL', "{$line->employee_name} has a deduction with no description.", $line);
            }

            // ---- warnings ----

            if ((float) $line->regular_hours > (float) $thresholds['max_regular_hours_per_period']) {
                $add($warnings, 'HOURS_ABOVE_EXPECTED', "{$line->employee_name} has an unusually high number of regular hours.", $line);
            }
            if ((float) $line->overtime_hours > (float) $line->regular_hours && (float) $line->overtime_hours > 0) {
                $add($warnings, 'OVERTIME_EXCEEDS_REGULAR', "{$line->employee_name} has more overtime than regular hours.", $line);
            }
            if ($employee && $employee->standard_hours_per_period
                && (float) $line->regular_hours > (float) $employee->standard_hours_per_period) {
                $add($warnings, 'ABOVE_STANDARD_HOURS', "{$line->employee_name} is above their standard hours for the period.", $line);
            }
            if ((float) $line->gross_amount <= 0) {
                $add($warnings, 'ZERO_GROSS_LINE', "{$line->employee_name} has a gross of zero.", $line);
            }

            if ($previous) {
                $prevLine = $previous->lines->firstWhere('payroll_employee_id', $line->payroll_employee_id);
                if ($prevLine) {
                    $before = $prevLine->totalHours();
                    $now = $line->totalHours();
                    if ($before > 0 && abs($now - $before) / $before > 0.4) {
                        $add($warnings, 'LARGE_CHANGE_FROM_PREVIOUS', "{$line->employee_name} differs sharply from the previous payroll ({$now} h against {$before} h).", $line);
                    }
                }
            }
        }

        // An active employee missing from the run is worth flagging, but not
        // blocking — leaving someone off can be entirely deliberate.
        if ($period) {
            $onRun = $lines->pluck('payroll_employee_id');
            $missing = Employee::where('firm_id', $run->firm_id)
                ->where('status', 'active')
                ->whereNotIn('id', $onRun)
                ->with('user')
                ->get();

            foreach ($missing as $employee) {
                $add($warnings, 'ACTIVE_EMPLOYEE_MISSING', "{$employee->displayName()} is active but not on this payroll.");
            }

            if ($period->cutoff_date && now()->toDateString() > $period->cutoff_date->toDateString()) {
                $add($warnings, 'SUBMITTED_AFTER_CUTOFF', 'This payroll is past its submission cutoff.');
            }
        }

        return [
            'passed'   => empty($errors),
            'errors'   => $errors,
            'warnings' => $warnings,
        ];
    }

    /** The most recent run for this firm before this one, by period start. */
    private function previousRunFor(Run $run): ?Run
    {
        if (! $run->period) {
            return null;
        }

        return Run::where('firm_id', $run->firm_id)
            ->where('id', '!=', $run->id)
            ->whereHas('period', fn ($q) => $q->whereDate('period_start', '<', $run->period->period_start))
            ->with(['period', 'lines'])
            ->orderByDesc('id')
            ->first();
    }

    /*
    |--------------------------------------------------------------------------
    | Notifications
    |--------------------------------------------------------------------------
    */

    private function notifyFirmClients(Firm $firm, string $title, string $message, string $type, ?int $runId = null): void
    {
        $recipients = User::where('firm_id', $firm->id)->role('Client')->get();

        foreach ($recipients as $recipient) {
            Notification::recordForPayrollRun($recipient->id, $title, $message, $type, auth()->id(), $runId);
        }
    }

    private function notifyFirmStaff(Firm $firm, string $title, string $message, string $type, ?int $runId = null): void
    {
        $assignedAccountantIds = OrganizationUserAssignment::where('firm_id', $firm->id)->pluck('user_id');

        $recipients = User::role('Admin')->get()
            ->merge(User::whereIn('id', $assignedAccountantIds)->role('Accountant')->get())
            ->unique('id');

        foreach ($recipients as $recipient) {
            Notification::recordForPayrollRun($recipient->id, $title, $message, $type, auth()->id(), $runId);
        }
    }
}
