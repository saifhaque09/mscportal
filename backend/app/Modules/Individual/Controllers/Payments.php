<?php

namespace App\Modules\Individual\Controllers;

use App\Http\Controllers\BaseController;
use App\Models\User;
use App\Modules\Payments\Models\Payment;
use Illuminate\Http\Request;
use Validator;

class Payments extends BaseController
{
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
     * Add a payment for an individual tax filer (no firm involved).
     */
    public function create(Request $request, int $user_id)
    {
        $taxfiler = User::find($user_id);
        if (! $taxfiler || ! $taxfiler->hasRole('Taxfiler')) {
            return $this->sendError('TAXFILER_NOT_FOUND');
        }

        $user = auth()->user();
        $isAccountant = $user->hasRole('Accountant');
        if (! $user->hasRole('Admin') && ! $isAccountant) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $this->normalizePaymentMethod($request);

        $rules = [
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

        $payment = Payment::create([
            'firm_id'        => null,
            'year'           => $validated['year'] ?? date('Y'),
            'admin_id'       => $user->id,
            'client_id'      => $taxfiler->id,
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
     * Edit a payment for an individual tax filer (no firm involved).
     *
     * Same authorization/validation shape as create() (Admin/Accountant
     * only); admin_id is always overwritten with the editing caller's id.
     */
    public function edit(Request $request, int $user_id, int $id)
    {
        $taxfiler = User::find($user_id);
        if (! $taxfiler || ! $taxfiler->hasRole('Taxfiler')) {
            return $this->sendError('TAXFILER_NOT_FOUND');
        }

        $user = auth()->user();
        $isAccountant = $user->hasRole('Accountant');
        if (! $user->hasRole('Admin') && ! $isAccountant) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $payment = Payment::where('id', $id)->where('client_id', $taxfiler->id)->first();
        if (! $payment) {
            return $this->sendError('PAYMENT_NOT_FOUND', 200);
        }

        $this->normalizePaymentMethod($request);

        $rules = [
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

        $payment->update([
            'year'           => $validated['year'] ?? date('Y'),
            'admin_id'       => $user->id,
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
     * List payments across ALL individual tax filers (not scoped to one),
     * with filters/pagination. Mirrors the business-side cross-firm sibling
     * Clients\Controllers\Payments::getAllFirms() — same isFirmStaff gate as
     * this controller's own view() (list is a read action, grouped with
     * view() rather than create()/edit()'s tightened Admin/Accountant-only
     * rule). Base query is firm_id IS NULL, the opposite of getAllFirms()'s
     * whereNotNull — this is the individual-taxfiler side only.
     */
    public function getAllTaxfilers(Request $request)
    {
        if (! $this->isFirmStaff('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $this->normalizePaymentMethod($request);

        $rules = [
            'user_id'           => ['nullable', 'integer', 'exists:users,id'],
            'admin_id'          => ['nullable', 'integer', 'exists:users,id'],
            'year'              => ['nullable', 'digits:4'],
            'status'            => ['nullable', 'in:pending,paid,cancelled'],
            'payment_method'    => ['nullable', 'in:cash,e_payment'],
            'search'            => ['nullable', 'string'],
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

        $sql = Payment::whereNull('firm_id');

        if (! empty($validated['user_id'])) {
            $sql = $sql->where('client_id', $validated['user_id']);
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
        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $sql = $sql->whereHas('client', function ($clientQuery) use ($search) {
                $clientQuery->whereAny(['first_name', 'last_name', 'email'], 'like', "%$search%");
            });
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

        return $this->sendResponse('RECORDS_FOUND', $payload);
    }

    /**
     * View a single payment for an individual tax filer (no firm involved).
     */
    public function view(Request $request, int $user_id, int $id)
    {
        $taxfiler = User::find($user_id);
        if (! $taxfiler || ! $taxfiler->hasRole('Taxfiler')) {
            return $this->sendError('TAXFILER_NOT_FOUND');
        }

        if (! $this->isFirmStaff('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $payment = Payment::where('id', $id)->where('client_id', $taxfiler->id)->first();
        if (! $payment) {
            return $this->sendError('PAYMENT_NOT_FOUND', 200);
        }

        return $this->sendResponse('PAYMENT_FOUND', $payment->load(['admin', 'client']));
    }
}
