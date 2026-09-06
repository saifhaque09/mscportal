<?php

namespace App\Modules\Payroll\Controllers;

use App\Http\Controllers\BaseController;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Clients\Models\Firm;
use App\Modules\Payroll\Models\Period;
use App\Modules\Payroll\Models\Setting;
use App\Services\PayrollPeriodService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Validation\Rule;
use Validator;

/**
 * The firm's pay-period schedule.
 *
 * Periods are generated from the firm's payment_type plus an anchor date, not
 * entered by hand — which is what makes "duplicate payroll period" impossible
 * rather than merely validated, since (firm_id, period_start, period_end)
 * carries a unique index.
 */
class Periods extends BaseController
{
    public function __construct(private PayrollPeriodService $periods) {}

    private function firm(string $guid): ?Firm
    {
        return Firm::where('guid', $guid)->first();
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
            'year'             => ['nullable', 'digits:4'],
            'status'           => ['nullable', Rule::in(Config::get('payroll.period_status'))],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $results_per_page = $validated['results_per_page'] ?? Config::get('payroll.filters.results_per_page');
        $page = $validated['page'] ?? Config::get('payroll.filters.page');

        $sql = Period::where('firm_id', $firm->id);
        if (! empty($validated['year'])) {
            $sql = $sql->where('year', $validated['year']);
        }
        if (! empty($validated['status'])) {
            $sql = $sql->where('status', $validated['status']);
        }
        $sql = $sql->orderByDesc('period_start');

        $total_results = $sql->count();
        $max = $total_results > 0 ? ceil($total_results / $results_per_page) : 1;
        $offset = (max(1, $page) - 1) * $results_per_page;

        // The run is eager-loaded because the client's period list is really a
        // "what have I submitted" view — a period without a run is the actionable row.
        $records = $sql->with('run')->limit($results_per_page)->offset($offset)->get();

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
     * Generate or extend the schedule.
     *
     * Idempotent — it continues from the last stored period rather than from
     * the anchor, and never rewrites a period that already has a run attached.
     */
    public function generate(Request $request, string $guid = '')
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'count' => ['nullable', 'integer', 'min:1', 'max:120'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        if (empty($firm->payment_type)) {
            return $this->sendError('FIRM_PAYMENT_TYPE_NOT_SET', 422);
        }

        $settings = Setting::firstOrCreate(
            ['firm_id' => $firm->id],
            ['status' => 'inactive', 'pay_frequency' => $firm->payment_type]
        );

        if (! $settings->period_anchor_date) {
            // Without an anchor there is nothing to count periods from — see
            // PayrollPeriodService for why the firm record alone is not enough.
            return $this->sendError('PAYROLL_ANCHOR_DATE_NOT_SET', 422);
        }

        $written = $this->periods->generateForFirm($firm, $settings, $validated['count'] ?? null);

        ActivityLog::record('payroll', "generated {$written} pay periods for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORDS_CREATED', [
            'generated' => $written,
            'data'      => Period::where('firm_id', $firm->id)->orderBy('period_start')->get(),
        ]);
    }

    /** The period the client should be entering right now: the earliest ended period with no run. */
    public function current(Request $request, string $guid = '')
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $period = Period::where('firm_id', $firm->id)
            ->where('status', '!=', 'skipped')
            ->whereDate('period_end', '<=', now()->toDateString())
            ->whereDoesntHave('run')
            ->orderBy('period_start')
            ->first();

        // Nothing to enter — fall back to the most recent period so the client
        // sees where they are in the cycle rather than an empty screen.
        if (! $period) {
            $period = Period::where('firm_id', $firm->id)
                ->orderByDesc('period_start')
                ->with('run')
                ->first();
        }

        if (! $period) {
            return $this->sendError('NO_PAYROLL_PERIODS', 200);
        }

        return $this->sendResponse('RECORD_FOUND', $period->load('run'));
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

        $period = Period::where('firm_id', $firm->id)->where('id', $id)->with('run')->first();
        if (! $period) {
            return $this->sendError('PAYROLL_PERIOD_NOT_FOUND', 404);
        }

        return $this->sendResponse('RECORD_FOUND', $period);
    }

    /**
     * Adjust the dates on a generated period.
     *
     * Locked once a run exists: moving the dates under a submitted payroll
     * would change what the accountant already reviewed.
     */
    public function edit(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $period = Period::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $period) {
            return $this->sendError('PAYROLL_PERIOD_NOT_FOUND', 404);
        }
        if ($period->run()->exists()) {
            return $this->sendError('PAYROLL_PERIOD_HAS_RUN', 422);
        }

        $validator = Validator::make($request->all(), [
            'pay_date'    => ['nullable', 'date', 'date_format:Y-m-d'],
            'cutoff_date' => ['nullable', 'date', 'date_format:Y-m-d'],
            'status'      => ['nullable', Rule::in(Config::get('payroll.period_status'))],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        foreach ($validator->validated() as $field => $value) {
            $period->{$field} = $value;
        }
        $period->save();

        ActivityLog::record('payroll', "updated pay period {$period->period_start} to {$period->period_end} for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORD_UPDATED', $period->fresh());
    }

    public function skip(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $period = Period::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $period) {
            return $this->sendError('PAYROLL_PERIOD_NOT_FOUND', 404);
        }
        if ($period->run()->exists()) {
            return $this->sendError('PAYROLL_PERIOD_HAS_RUN', 422);
        }

        $period->status = 'skipped';
        $period->save();

        ActivityLog::record('payroll', "skipped pay period {$period->period_start} to {$period->period_end} for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORD_UPDATED', $period->fresh());
    }
}
