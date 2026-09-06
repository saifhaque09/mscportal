<?php

namespace App\Modules\Clients\Controllers;

use App\Http\Controllers\BaseController;
use App\Models\User;
use App\Modules\Clients\Models\Firm;
use App\Modules\Payments\Models\Payment;
use Illuminate\Http\Request;
use Validator;

class Payments extends BaseController
{
    /**
     * Payments are Admin-only to create/edit. Accountant (and Admin) may
     * only view/list them — see canViewPayments().
     */
    private function canManagePayments(): bool
    {
        return (bool) auth()->user()?->hasRole('Admin');
    }

    /**
     * Admin or Accountant may view/list payments — Staff no longer has
     * view access here even if they hold firms.manage.
     */
    private function canViewPayments(): bool
    {
        $user = auth()->user();
        return (bool) $user && ($user->hasRole('Admin') || $user->hasRole('Accountant'));
    }

    /**
     * Accepts "e-payment" (hyphen) as an alias for the "e_payment" enum
     * value the DB/validation actually use, normalizing before validation
     * runs so callers can send either form.
     */
    private function normalizePaymentMethod(Request $request): void
    {
        if ($request->input('payment_method') === 'e-payment') {
            $request->merge(['payment_method' => 'e_payment']);
        }
    }

    /**
     * Add a payment for a business client (firm-scoped). client_id is
     * optional — if omitted, it's auto-resolved to the firm's single
     * Client-role user; if the firm has zero or more than one, an error
     * is returned instead of guessing.
     */
    public function create(Request $request, string $guid = '')
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        if (! $this->canManagePayments()) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $this->normalizePaymentMethod($request);

        $rules = [
            'client_id'      => ['nullable', 'integer', 'exists:users,id'],
            'year'           => ['nullable', 'digits:4'],
            'amount'         => ['required', 'numeric', 'min:0'],
            'payment_method' => ['required', 'in:cash,e_payment'],
            'transaction_id' => ['required_if:payment_method,e_payment', 'nullable', 'string', 'max:255'],
            'status'         => ['nullable', 'in:pending,paid,cancelled'],
            'payment_date'   => ['nullable', 'date'],
            'remarks'        => ['nullable', 'string', 'max:500'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        if (! empty($validated['client_id'])) {
            $client = User::find($validated['client_id']);
            if (! $client || ! $client->hasRole('Client') || (int) $client->firm_id !== (int) $firm->id) {
                return $this->sendError('CLIENT_NOT_FOUND_FOR_FIRM');
            }
        } else {
            $firmClients = User::where('firm_id', $firm->id)->role('Client')->get();
            if ($firmClients->count() === 0) {
                return $this->sendError('CLIENT_NOT_FOUND_FOR_FIRM');
            }
            if ($firmClients->count() > 1) {
                return $this->sendError('CLIENT_ID_REQUIRED_MULTIPLE_CLIENTS');
            }
            $client = $firmClients->first();
        }

        $payment = Payment::create([
            'firm_id'        => $firm->id,
            'year'           => $validated['year'] ?? date('Y'),
            'admin_id'       => auth()->id(),
            'client_id'      => $client->id,
            'amount'         => $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'transaction_id' => $validated['transaction_id'] ?? null,
            'status'         => $validated['status'] ?? 'pending',
            'payment_date'   => $validated['payment_date'] ?? null,
            'remarks'        => $validated['remarks'] ?? null,
        ]);

        return $this->sendResponse('PAYMENT_CREATED', $payment->fresh());
    }

    /**
     * Edit a payment for a business client (firm-scoped).
     *
     * Same authorization/validation shape as create() (isFirmStaff gate);
     * admin_id is always overwritten with the editing caller's id.
     */
    public function edit(Request $request, string $guid, int $id)
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        if (! $this->isFirmStaff('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $payment = Payment::where('id', $id)->where('firm_id', $firm->id)->first();
        if (! $payment) {
            return $this->sendError('PAYMENT_NOT_FOUND', 200);
        }

        $this->normalizePaymentMethod($request);

        $rules = [
            'client_id'      => ['required', 'integer', 'exists:users,id'],
            'year'           => ['nullable', 'digits:4'],
            'amount'         => ['required', 'numeric', 'min:0'],
            'payment_method' => ['required', 'in:cash,e_payment'],
            'transaction_id' => ['required_if:payment_method,e_payment', 'nullable', 'string', 'max:255'],
            'status'         => ['nullable', 'in:pending,paid,cancelled'],
            'payment_date'   => ['nullable', 'date'],
            'remarks'        => ['nullable', 'string', 'max:500'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $client = User::find($validated['client_id']);
        if (! $client || ! $client->hasRole('Client') || (int) $client->firm_id !== (int) $firm->id) {
            return $this->sendError('CLIENT_NOT_FOUND_FOR_FIRM');
        }

        $payment->update([
            'year'           => $validated['year'] ?? date('Y'),
            'admin_id'       => auth()->id(),
            'client_id'      => $client->id,
            'amount'         => $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'transaction_id' => $validated['transaction_id'] ?? null,
            'status'         => $validated['status'] ?? 'pending',
            'payment_date'   => $validated['payment_date'] ?? null,
            'remarks'        => $validated['remarks'] ?? null,
        ]);

        return $this->sendResponse('PAYMENT_UPDATED', $payment->fresh());
    }

    /**
     * List payments across ALL business firms (not scoped to a single one),
     * with the same filters/pagination as the firm-scoped getAll() below,
     * plus an optional firm_id to narrow to one firm without the guid route.
     * Individual-taxfiler payments (firm_id NULL) are excluded — this is
     * the business-client side only.
     */
    public function getAllFirms(Request $request)
    {
        if (! $this->isFirmStaff('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $this->normalizePaymentMethod($request);

        $rules = [
            'firm_id'           => ['nullable', 'integer', 'exists:firms,id'],
            'client_id'         => ['nullable', 'integer', 'exists:users,id'],
            'admin_id'          => ['nullable', 'integer', 'exists:users,id'],
            'year'              => ['nullable', 'digits:4'],
            'status'            => ['nullable', 'in:pending,paid,cancelled'],
            'payment_method'    => ['nullable', 'in:cash,e_payment'],
            'from_date'         => ['nullable', 'date'],
            'to_date'           => ['nullable', 'date', 'after_or_equal:from_date'],
            'results_per_page'  => ['nullable', 'numeric', 'gt:0'],
            'page'              => ['nullable', 'numeric'],
            'order_by'          => ['nullable', 'in:newest_first,newest_last'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $results_per_page = $validated['results_per_page'] ?? 15;
        $page             = $validated['page'] ?? 1;
        $order_by         = $validated['order_by'] ?? 'newest_first';

        $sql = Payment::whereNotNull('firm_id');

        if (! empty($validated['firm_id'])) {
            $sql = $sql->where('firm_id', $validated['firm_id']);
        }
        if (! empty($validated['client_id'])) {
            $sql = $sql->where('client_id', $validated['client_id']);
        }
        if (! empty($validated['admin_id'])) {
            $sql = $sql->where('admin_id', $validated['admin_id']);
        }
        if (! empty($validated['year'])) {
            $sql = $sql->where('year', $validated['year']);
        }
        if (! empty($validated['status'])) {
            $sql = $sql->where('status', $validated['status']);
        }
        if (! empty($validated['payment_method'])) {
            $sql = $sql->where('payment_method', $validated['payment_method']);
        }
        if (! empty($validated['from_date'])) {
            $sql = $sql->whereDate('payment_date', '>=', $validated['from_date']);
        }
        if (! empty($validated['to_date'])) {
            $sql = $sql->whereDate('payment_date', '<=', $validated['to_date']);
        }

        $sql = $sql->orderBy('created_at', $order_by === 'newest_last' ? 'asc' : 'desc');

        $total_results = $sql->count();
        $max    = $total_results > 0 ? ceil($total_results / $results_per_page) : 1;
        $offset = (max(1, $page) - 1) * $results_per_page;

        $records = $sql->with(['firm', 'admin', 'client'])->limit($results_per_page)->offset($offset)->get();

        $payload = [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $max,
                'current_page'  => intval($page),
                'num_results'   => count($records),
                'total_results' => $total_results,
            ],
            'data' => $records,
        ];

        return $this->sendResponse('RECORDS_FOUND', $payload);
    }

    /**
     * Platform-wide pending-payment total for the dashboard "Payment
     * Pending" card — sums both business (firm_id set) and taxfiler
     * (firm_id null) payments in one query since they share this table.
     * View-only, so gated the same as everywhere else payments are read.
     */
    public function summary()
    {
        if (! $this->canViewPayments()) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $pending = Payment::where('status', 'pending')
            ->selectRaw('COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as total_count')
            ->first();

        return $this->sendResponse('COUNT_FETCHED', [
            'pending_amount' => (float) $pending->total_amount,
            'pending_count'  => (int) $pending->total_count,
        ]);
    }

    /**
     * List payments for a business client (firm-scoped), with filters and
     * pagination. Same authorization gate as the other endpoints in this
     * controller (isFirmStaff('firms.manage')).
     */
    public function getAll(Request $request, string $guid)
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        if (! $this->isFirmStaff('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $this->normalizePaymentMethod($request);

        $rules = [
            'client_id'         => ['nullable', 'integer', 'exists:users,id'],
            'admin_id'          => ['nullable', 'integer', 'exists:users,id'],
            'year'              => ['nullable', 'digits:4'],
            'status'            => ['nullable', 'in:pending,paid,cancelled'],
            'payment_method'    => ['nullable', 'in:cash,e_payment'],
            'from_date'         => ['nullable', 'date'],
            'to_date'           => ['nullable', 'date', 'after_or_equal:from_date'],
            'results_per_page'  => ['nullable', 'numeric', 'gt:0'],
            'page'              => ['nullable', 'numeric'],
            'order_by'          => ['nullable', 'in:newest_first,newest_last'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $results_per_page = $validated['results_per_page'] ?? 15;
        $page             = $validated['page'] ?? 1;
        $order_by         = $validated['order_by'] ?? 'newest_first';

        $sql = Payment::where('firm_id', $firm->id);

        if (! empty($validated['client_id'])) {
            $sql = $sql->where('client_id', $validated['client_id']);
        }
        if (! empty($validated['admin_id'])) {
            $sql = $sql->where('admin_id', $validated['admin_id']);
        }
        if (! empty($validated['year'])) {
            $sql = $sql->where('year', $validated['year']);
        }
        if (! empty($validated['status'])) {
            $sql = $sql->where('status', $validated['status']);
        }
        if (! empty($validated['payment_method'])) {
            $sql = $sql->where('payment_method', $validated['payment_method']);
        }
        if (! empty($validated['from_date'])) {
            $sql = $sql->whereDate('payment_date', '>=', $validated['from_date']);
        }
        if (! empty($validated['to_date'])) {
            $sql = $sql->whereDate('payment_date', '<=', $validated['to_date']);
        }

        $sql = $sql->orderBy('created_at', $order_by === 'newest_last' ? 'asc' : 'desc');

        $total_results = $sql->count();
        $max    = $total_results > 0 ? ceil($total_results / $results_per_page) : 1;
        $offset = (max(1, $page) - 1) * $results_per_page;

        $records = $sql->with(['admin', 'client'])->limit($results_per_page)->offset($offset)->get();

        $payload = [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $max,
                'current_page'  => intval($page),
                'num_results'   => count($records),
                'total_results' => $total_results,
            ],
            'data' => $records,
        ];

        // An empty result set is a valid, successful response, matching the
        // Notifications::getAll() precedent — not treated as an error.
        return $this->sendResponse('RECORDS_FOUND', $payload);
    }

    /**
     * View a single payment for a business client (firm-scoped).
     */
    public function view(Request $request, string $guid, int $id)
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        if (! $this->isFirmStaff('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $payment = Payment::where('id', $id)->where('firm_id', $firm->id)->first();
        if (! $payment) {
            return $this->sendError('PAYMENT_NOT_FOUND', 200);
        }

        return $this->sendResponse('PAYMENT_FOUND', $payment->load(['admin', 'client', 'firm']));
    }
}
