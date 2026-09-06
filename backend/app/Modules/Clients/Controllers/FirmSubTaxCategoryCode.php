<?php

namespace App\Modules\Clients\Controllers;

use App\Http\Controllers\BaseController;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Clients\Models\Checklist;
use App\Modules\Clients\Models\Firm;
use App\Modules\Clients\Models\FirmSubTaxCategoryCode as FirmCodeModel;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Validator;

class FirmSubTaxCategoryCode extends BaseController
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'firm_id'              => ['required', 'integer', 'exists:firms,id'],
            'checklist_item_id'    => ['required', 'integer', 'exists:checklist_items,id'],
            'year'                 => ['nullable', 'digits:4'],
            'items'                => ['nullable', 'array', 'min:1'],
            'items.*.code'         => ['required_with:items', 'string', 'max:255'],
            'items.*.value'        => ['required_with:items', 'numeric'],
            'items.*.vendor_name'    => ['required_with:items', 'string', 'max:255'],
            'items.*.invoice_date'   => ['required_with:items', 'date'],
            'items.*.invoice_number' => ['required_with:items', 'string', 'max:255'],
            'items.*.gst_hst_tax'    => ['required_with:items', 'numeric'],
            'items.*.status'       => ['nullable', 'in:active,inactive'],
            'code_array'           => ['nullable', 'array', 'min:1'],
            'code_array.*'         => ['required_with:code_array', 'string', 'max:255'],
            'value_array'          => ['required_with:code_array', 'array', 'min:1'],
            'value_array.*'        => ['required_with:value_array', 'numeric'],
            'vendor_name_array'      => ['required_with:code_array', 'array', 'min:1'],
            'vendor_name_array.*'    => ['required_with:vendor_name_array', 'string', 'max:255'],
            'invoice_date_array'     => ['required_with:code_array', 'array', 'min:1'],
            'invoice_date_array.*'   => ['required_with:invoice_date_array', 'date'],
            'invoice_number_array'   => ['required_with:code_array', 'array', 'min:1'],
            'invoice_number_array.*' => ['required_with:invoice_number_array', 'string', 'max:255'],
            'gst_hst_tax_array'      => ['required_with:code_array', 'array', 'min:1'],
            'gst_hst_tax_array.*'    => ['required_with:gst_hst_tax_array', 'numeric'],
            'status_array'         => ['nullable', 'array'],
            'status_array.*'       => ['nullable', 'in:active,inactive'],
            'code'                 => ['required_without_all:items,code_array', 'string', 'max:255'],
            'value'                => ['required_without_all:items,value_array', 'numeric'],
            'vendor_name'          => ['required_without_all:items,code_array', 'string', 'max:255'],
            'invoice_date'         => ['required_without_all:items,code_array', 'date'],
            'invoice_number'       => ['required_without_all:items,code_array', 'string', 'max:255'],
            'gst_hst_tax'          => ['required_without_all:items,code_array', 'numeric'],
            'status'               => ['nullable', 'in:active,inactive'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        $firm = Firm::find($validated['firm_id']);
        if (! $firm) {
            return $this->sendError('FIRM_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', null, blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $checklistItem = Checklist::find($validated['checklist_item_id']);
        if (! $checklistItem || (int) $checklistItem->firm_id !== (int) $firm->id) {
            return $this->sendError('CHECKLIST_ITEM_NOT_FOUND', 404);
        }

        $addedBy = auth()->id();
        $year    = $validated['year'] ?? null;

        if (isset($validated['items'])) {
            $items = $validated['items'];
        } elseif (isset($validated['code_array'])) {
            $items         = [];
            $parallelArrays = [
                'value_array'          => 'value',
                'vendor_name_array'    => 'vendor_name',
                'invoice_date_array'   => 'invoice_date',
                'invoice_number_array' => 'invoice_number',
                'gst_hst_tax_array'    => 'gst_hst_tax',
            ];
            $missing = [];

            foreach ($validated['code_array'] as $key => $code) {
                $rowMissing = [];
                foreach ($parallelArrays as $arrayKey => $field) {
                    if (! array_key_exists($key, $validated[$arrayKey] ?? [])) {
                        $rowMissing[] = $arrayKey;
                    }
                }

                if (! empty($rowMissing)) {
                    $missing[$key] = $rowMissing;
                    continue;
                }

                $items[] = [
                    'code'           => $code,
                    'value'          => $validated['value_array'][$key],
                    'vendor_name'    => $validated['vendor_name_array'][$key],
                    'invoice_date'   => $validated['invoice_date_array'][$key],
                    'invoice_number' => $validated['invoice_number_array'][$key],
                    'gst_hst_tax'    => $validated['gst_hst_tax_array'][$key],
                    'status'         => $validated['status_array'][$key] ?? null,
                ];
            }

            if (! empty($missing)) {
                $messages = [];
                foreach ($missing as $key => $rowMissing) {
                    $messages[] = "index {$key} missing " . implode(', ', $rowMissing);
                }

                return $this->sendError([
                    'code_array' => $messages,
                ], 422);
            }
        } else {
            $items = [[
                'code'           => $validated['code'],
                'value'          => $validated['value'],
                'vendor_name'    => $validated['vendor_name'],
                'invoice_date'   => $validated['invoice_date'],
                'invoice_number' => $validated['invoice_number'],
                'gst_hst_tax'    => $validated['gst_hst_tax'],
                'status'         => $validated['status'] ?? null,
            ]];
        }

        $saved    = collect();
        $existing = collect();

        foreach ($items as $item) {
            $code           = trim((string) $item['code']);
            $value          = $item['value'];
            $vendorName     = trim((string) $item['vendor_name']);
            $invoiceDate    = $item['invoice_date'];
            $invoiceNumber  = trim((string) $item['invoice_number']);
            $gstHstTax      = $item['gst_hst_tax'];
            $status         = $item['status'] ?? $validated['status'] ?? 'active';

            $existingRecord = FirmCodeModel::where('firm_id', $firm->id)
                ->where('checklist_item_id', $validated['checklist_item_id'])
                ->where('code', $code)
                ->where('value', $value)
                ->where('year', $year)
                ->where('invoice_number', $invoiceNumber)
                ->first();

            if ($existingRecord) {
                $existing->push($this->formatRecord($existingRecord));
                continue;
            }

            try {
                $record = FirmCodeModel::create([
                    'firm_id'            => $firm->id,
                    'added_by'           => $addedBy,
                    'checklist_item_id'  => $validated['checklist_item_id'],
                    'year'               => $year,
                    'code'               => $code,
                    'value'              => $value,
                    'vendor_name'        => $vendorName,
                    'invoice_date'       => $invoiceDate,
                    'invoice_number'     => $invoiceNumber,
                    'gst_hst_tax'        => $gstHstTax,
                    'status'             => $status,
                ]);
            } catch (QueryException $exception) {
                $duplicateRecord = FirmCodeModel::where('firm_id', $firm->id)
                    ->where('checklist_item_id', $validated['checklist_item_id'])
                    ->where('code', $code)
                    ->where('value', $value)
                    ->where('year', $year)
                    ->where('invoice_number', $invoiceNumber)
                    ->first();

                if (! $duplicateRecord) {
                    throw $exception;
                }

                $existing->push($this->formatRecord($duplicateRecord));
                continue;
            }

            $saved->push($this->formatRecord($record));
        }

        ActivityLog::record('firms', "adding code and values for {$checklistItem->name} subcategory", null, $addedBy);

        return $this->sendResponse('FIRM_SUB_TAX_CATEGORY_CODES_SAVED', [
            'firm_id'              => $firm->id,
            'firm_name'            => $firm->firm_name,
            'added_by'             => $addedBy,
            'checklist_item_id'    => $checklistItem->id,
            'checklist_item_name'  => $checklistItem->name,
            'saved_count'          => $saved->count(),
            'existing_count'       => $existing->count(),
            'saved'                => $saved->values(),
            'existing'             => $existing->values(),
        ]);
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id'                  => ['required', 'integer', 'exists:firm_sub_tax_category_codes,id'],
            'firm_id'             => ['required', 'integer', 'exists:firms,id'],
            'checklist_item_id'   => ['nullable', 'integer', 'exists:checklist_items,id'],
            'code'                => ['required', 'string', 'max:255'],
            'value'               => ['required', 'numeric'],
            'vendor_name'         => ['required', 'string', 'max:255'],
            'invoice_date'        => ['required', 'date'],
            'invoice_number'      => ['required', 'string', 'max:255'],
            'gst_hst_tax'         => ['required', 'numeric'],
            'status'              => ['nullable', 'in:active,inactive'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $record    = FirmCodeModel::find($validated['id']);

        if (! $record) {
            return $this->sendError('FIRM_SUB_TAX_CATEGORY_CODE_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($record->firm_id, 'firms.manage', null, blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        if ((int) $record->firm_id !== (int) $validated['firm_id']) {
            return $this->sendError('FIRM_MISMATCH', 422);
        }

        $checklistItemId = $validated['checklist_item_id'] ?? $record->checklist_item_id;
        $code             = trim((string) $validated['code']);
        $value            = $validated['value'];
        $vendorName       = trim((string) $validated['vendor_name']);
        $invoiceDate      = $validated['invoice_date'];
        $invoiceNumber    = trim((string) $validated['invoice_number']);
        $gstHstTax        = $validated['gst_hst_tax'];

        $duplicate = FirmCodeModel::where('firm_id', $validated['firm_id'])
            ->where('checklist_item_id', $checklistItemId)
            ->where('code', $code)
            ->where('value', $value)
            ->where('invoice_number', $invoiceNumber)
            ->where('id', '!=', $record->id)
            ->exists();

        if ($duplicate) {
            return $this->sendError('THIS_CODE_VALUE_ALREADY_EXISTS', 409);
        }

        $record->firm_id            = $validated['firm_id'];
        $record->added_by           = $record->added_by ?? auth()->id();
        $record->checklist_item_id  = $checklistItemId;
        $record->code                = $code;
        $record->value               = $value;
        $record->vendor_name         = $vendorName;
        $record->invoice_date        = $invoiceDate;
        $record->invoice_number      = $invoiceNumber;
        $record->gst_hst_tax         = $gstHstTax;
        $record->status              = $validated['status'] ?? $record->status;
        $record->save();

        return $this->sendResponse('FIRM_SUB_TAX_CATEGORY_CODE_UPDATED', [
            'data' => $this->formatRecord($record),
        ]);
    }

    public function delete(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id'      => ['required', 'integer', 'exists:firm_sub_tax_category_codes,id'],
            'firm_id' => ['required', 'integer', 'exists:firms,id'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $record    = FirmCodeModel::find($validated['id']);

        if (! $record) {
            return $this->sendError('FIRM_SUB_TAX_CATEGORY_CODE_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($record->firm_id, 'firms.manage', null, blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        if ((int) $record->firm_id !== (int) $validated['firm_id']) {
            return $this->sendError('FIRM_MISMATCH', 422);
        }

        $record->delete();

        return $this->sendResponse('FIRM_SUB_TAX_CATEGORY_CODE_DELETED', [
            'id'      => (int) $validated['id'],
            'firm_id' => (int) $validated['firm_id'],
        ]);
    }

    public function listByChecklistItem(int $firm_id, int $checklist_item_id)
    {
        $firm = Firm::find($firm_id);
        if (! $firm) {
            return $this->sendError('FIRM_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($firm->id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $checklistItem = Checklist::find($checklist_item_id);
        if (! $checklistItem || (int) $checklistItem->firm_id !== (int) $firm->id) {
            return $this->sendError('CHECKLIST_ITEM_NOT_FOUND', 404);
        }

        $records = FirmCodeModel::where('firm_id', $firm_id)
            ->where('checklist_item_id', $checklist_item_id)
            ->orderBy('code')
            ->get()
            ->map(fn ($r) => $this->formatRecord($r))
            ->values();

        return $this->sendResponse('RECORDS_FOUND', [
            'firm_id'             => $firm->id,
            'firm_name'           => $firm->firm_name,
            'checklist_item_id'   => $checklistItem->id,
            'checklist_item_name' => $checklistItem->name,
            'done_status'         => $checklistItem->done_status,
            'data'                => $records,
        ]);
    }

    public function listSelected(Request $request, string $guid)
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('FIRM_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($firm->id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'checklist_item_id' => ['nullable', 'integer', 'exists:checklist_items,id'],
            'search'            => ['nullable', 'string'],
            'results_per_page'  => ['nullable', 'numeric', 'gt:0'],
            'page'              => ['nullable', 'numeric', 'gt:0'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated        = $validator->validated();
        $results_per_page = (int) ($validated['results_per_page'] ?? 15);
        $page             = (int) ($validated['page'] ?? 1);
        $offset           = ($page - 1) * $results_per_page;
        $search           = $validated['search'] ?? '';

        $query = FirmCodeModel::query()
            ->where('firm_id', $firm->id)
            ->when(! empty($validated['checklist_item_id']), fn ($q) =>
                $q->where('checklist_item_id', $validated['checklist_item_id'])
            )
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('code', 'like', "%{$search}%")
                        ->orWhere('value', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhereHas('checklistItem', fn ($sq) =>
                            $sq->where('name', 'like', "%{$search}%")
                               ->orWhere('code', 'like', "%{$search}%")
                        );
                });
            });

        // Same code can be added under multiple subcategories (checklist items) for the
        // same firm/year — merge those into a single row here, summing the values (and
        // gst_hst_tax into a combined total), rather than listing the same code once
        // per subcategory. e.g. subcategory A: code 101, value 100, gst 13 -> 113;
        // subcategory B: code 101, value 200, gst 12 -> 212; grouped row: value 300,
        // gst_hst_tax 25, total 325 (113 + 212).
        $grouped = $query
            ->get(['code', 'year', 'value', 'gst_hst_tax', 'status'])
            ->groupBy(fn ($r) => $r->code . '|' . ($r->year ?? ''))
            ->map(function ($group) {
                $first   = $group->first();
                $value   = (float) $group->sum('value');
                $gstTax  = (float) $group->sum('gst_hst_tax');

                return [
                    'code'        => $first->code,
                    'year'        => $first->year,
                    'value'       => $value,
                    'gst_hst_tax' => $gstTax,
                    'total'       => $value + $gstTax,
                    'status'      => $group->contains('status', 'active')
                        ? 'active'
                        : ($first->status ?? null),
                ];
            })
            ->sortBy('code')
            ->values();

        $total_results = $grouped->count();
        $max           = (int) ceil($total_results / $results_per_page);

        $records = $grouped->slice($offset, $results_per_page)->values();

        return $this->sendResponse('RECORDS_FOUND', [
            'firm'   => ['id' => $firm->id, 'guid' => $firm->guid, 'firm_name' => $firm->firm_name],
            'meta'   => [
                'first_page'    => 1,
                'last_page'     => max($max, 1),
                'current_page'  => $page,
                'num_results'   => $records->count(),
                'total_results' => $total_results,
            ],
            'data'   => $records,
        ]);
    }

    private function formatRecord(FirmCodeModel $record): array
    {
        return [
            'id'                 => $record->id,
            'firm_id'            => $record->firm_id,
            'added_by'           => $record->added_by,
            'checklist_item_id'  => $record->checklist_item_id,
            'code'               => $record->code,
            'value'              => $record->value,
            'vendor_name'        => $record->vendor_name,
            'invoice_date'       => $record->invoice_date,
            'invoice_number'     => $record->invoice_number,
            'gst_hst_tax'        => $record->gst_hst_tax,
            'status'             => $record->status,
            'created_at'         => $record->created_at,
            'updated_at'         => $record->updated_at,
        ];
    }
}
