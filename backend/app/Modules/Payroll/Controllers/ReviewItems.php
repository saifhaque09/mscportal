<?php

namespace App\Modules\Payroll\Controllers;

use App\Http\Controllers\BaseController;
use App\Http\Controllers\BaseController as Base;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Payroll\Models\ReviewItem;
use App\Modules\Payroll\Models\Run;
use App\Modules\Payroll\Models\RunLine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Validation\Rule;
use Validator;

/**
 * The change-request loop.
 *
 * An accountant raises items; the client answers them. A run cannot reach
 * ready_to_process, and cannot be resubmitted, while any item is still open
 * with severity change_required — that single condition is what makes the loop
 * a real gate rather than a comment thread.
 */
class ReviewItems extends BaseController
{
    private function run(string $runGuid): ?Run
    {
        return Run::where('guid', $runGuid)->with('firm')->first();
    }

    public function getAll(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmScope($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => ['nullable', Rule::in(Config::get('payroll.review_status'))],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        $sql = ReviewItem::where('payroll_run_id', $run->id);
        if (! empty($validated['status'])) {
            $sql = $sql->where('status', $validated['status']);
        }

        return $this->sendResponse('RECORDS_FOUND', [
            'data' => $sql->with(['raisedBy', 'line'])->orderByDesc('id')->get(),
        ]);
    }

    /**
     * Raise a single item without moving the run.
     *
     * Runs::requestChanges is the usual path — it raises a batch and sends the
     * run back in one action. This exists for adding a query to a run that is
     * already with the client.
     */
    public function create(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmManageAction($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'payroll_run_line_id' => ['nullable', 'integer'],
            'field'               => ['nullable', 'string', 'max:60'],
            'severity'            => ['nullable', Rule::in(Config::get('payroll.review_severity'))],
            'comment'             => ['required', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        $lineId = $validated['payroll_run_line_id'] ?? null;
        if ($lineId && ! RunLine::where('payroll_run_id', $run->id)->where('id', $lineId)->exists()) {
            return $this->sendError('PAYROLL_RUN_LINE_NOT_FOUND', 422);
        }

        $item = ReviewItem::create([
            'payroll_run_id'      => $run->id,
            'payroll_run_line_id' => $lineId,
            'field'               => $validated['field'] ?? null,
            'severity'            => $validated['severity'] ?? 'change_required',
            'status'              => 'open',
            'comment'             => $validated['comment'],
            'raised_by'           => auth()->id(),
            'raised_at'           => now(),
            'round'               => (int) $run->version,
        ]);

        ActivityLog::record('payroll', "raised a payroll query for {$run->firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORD_CREATED', $item->fresh(['raisedBy', 'line']));
    }

    /**
     * The client answers a query.
     *
     * Marked addressed rather than resolved: the client says what they did, the
     * accountant decides whether that settles it. Both count as no longer open
     * for the purpose of the resubmit gate.
     */
    public function respond(Request $request, string $runGuid = '', int $id = 0)
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmScope($run->firm_id, 'firms.manage', 'manage_payroll', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $item = ReviewItem::where('payroll_run_id', $run->id)->where('id', $id)->first();
        if (! $item) {
            return $this->sendError('REVIEW_ITEM_NOT_FOUND', 404);
        }
        if ($item->status !== 'open') {
            return $this->sendError('REVIEW_ITEM_NOT_OPEN', 422);
        }

        $validator = Validator::make($request->all(), [
            'response' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $item->status = 'addressed';
        $item->addressed_at = now();
        $item->resolution_note = $validator->validated()['response'] ?? null;
        $item->save();

        return $this->sendResponse('RECORD_UPDATED', $item->fresh(['raisedBy', 'line']));
    }

    /** The accountant closes a query off. */
    public function resolve(Request $request, string $runGuid = '', int $id = 0)
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmManageAction($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $item = ReviewItem::where('payroll_run_id', $run->id)->where('id', $id)->first();
        if (! $item) {
            return $this->sendError('REVIEW_ITEM_NOT_FOUND', 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => ['nullable', Rule::in(['resolved', 'withdrawn'])],
            'note'   => ['nullable', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        $item->status = $validated['status'] ?? 'resolved';
        $item->resolved_at = now();
        $item->resolved_by = auth()->id();
        if (! empty($validated['note'])) {
            $item->resolution_note = $validated['note'];
        }
        $item->save();

        return $this->sendResponse('RECORD_UPDATED', $item->fresh(['raisedBy', 'line']));
    }

    /** Close every outstanding query on the run in one action. */
    public function bulkResolve(Request $request, string $runGuid = '')
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return $this->sendError('PAYROLL_RUN_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmManageAction($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $affected = ReviewItem::where('payroll_run_id', $run->id)
            ->whereIn('status', ['open', 'addressed'])
            ->update([
                'status'      => 'resolved',
                'resolved_at' => now(),
                'resolved_by' => auth()->id(),
            ]);

        ActivityLog::record('payroll', "resolved {$affected} payroll queries for {$run->firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORDS_UPDATED', ['resolved' => $affected]);
    }
}
