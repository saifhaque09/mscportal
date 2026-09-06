<?php

namespace App\Modules\Individual\Controllers;

use App\Http\Controllers\BaseController;
use App\Models\User;
use App\Modules\Individual\Models\SubTaxCategory;
use App\Modules\Individual\Models\SubTaxCategoryCode as SubTaxCategoryCodeModel;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Config;
use Validator;

class SubTaxCategoryCode extends BaseController
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'sub_tax_category_id' => ['required', 'exists:sub_tax_categories,id'],
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.code' => ['required_with:items', 'string', 'max:255'],
            'items.*.value' => ['required_with:items', 'numeric'],
            'items.*.status' => ['nullable', 'in:active,inactive'],
            'code_array' => ['nullable', 'array', 'min:1'],
            'code_array.*' => ['required_with:code_array', 'string', 'max:255'],
            'value_array' => ['required_with:code_array', 'array', 'min:1'],
            'value_array.*' => ['required_with:value_array', 'numeric'],
            'status_array' => ['nullable', 'array'],
            'status_array.*' => ['nullable', 'in:active,inactive'],
            'code' => ['required_without_all:items,code_array', 'string', 'max:255'],
            'value' => ['required_without_all:items,value_array', 'numeric'],
            'status' => ['nullable', 'in:active,inactive'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        if (! $this->authorizeUserScope($validated['user_id'], 'tax-documents.upload')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $subTaxCategory = SubTaxCategory::find($validated['sub_tax_category_id']);
        if (! $subTaxCategory) {
            return $this->sendError('SUBCATEGORY_NOT_FOUND', 404);
        }

        $taxfilerId = (int) $validated['user_id'];
        $addedBy = auth()->id();
        if (isset($validated['items'])) {
            $items = $validated['items'];
        } elseif (isset($validated['code_array'])) {
            $items = [];
            $missingValues = [];

            foreach ($validated['code_array'] as $key => $code) {
                if (! array_key_exists($key, $validated['value_array'] ?? [])) {
                    $missingValues[] = $key;
                    continue;
                }

                $items[] = [
                    'code' => $code,
                    'value' => $validated['value_array'][$key],
                    'status' => $validated['status_array'][$key] ?? null,
                ];
            }

            if (! empty($missingValues)) {
                return $this->sendError([
                    'value_array' => ['Missing value for code_array indexes: ' . implode(', ', $missingValues)],
                ], 422);
            }
        } else {
            $items = [[
                'code' => $validated['code'],
                'value' => $validated['value'],
                'status' => $validated['status'] ?? null,
            ]];
        }

        $saved = collect();
        $existing = collect();

        foreach ($items as $item) {
            $code = trim((string) $item['code']);
            $value = $item['value'];
            $status = $item['status'] ?? $validated['status'] ?? 'active';

            $existingRecord = SubTaxCategoryCodeModel::where('user_id', $taxfilerId)
                ->where('sub_tax_category_id', $validated['sub_tax_category_id'])
                ->where('code', $code)
                ->where('value', $value)
                ->first();

            if ($existingRecord) {
                $existing->push($this->formatRecord($existingRecord));
                continue;
            }

            try {
                $record = SubTaxCategoryCodeModel::create([
                    'user_id' => $taxfilerId,
                    'added_by' => $addedBy,
                    'sub_tax_category_id' => $validated['sub_tax_category_id'],
                    'code' => $code,
                    'value' => $value,
                    'status' => $status,
                ]);
            } catch (QueryException $exception) {
                $duplicateRecord = SubTaxCategoryCodeModel::where('user_id', $taxfilerId)
                    ->where('sub_tax_category_id', $validated['sub_tax_category_id'])
                    ->where('code', $code)
                    ->where('value', $value)
                    ->first();

                if (! $duplicateRecord) {
                    throw $exception;
                }

                $existing->push($this->formatRecord($duplicateRecord));
                continue;
            }

            $saved->push($this->formatRecord($record));
        }

        return $this->sendResponse('SUB_TAX_CATEGORY_CODES_SAVED', [
            'user_id' => $taxfilerId,
            'added_by' => $addedBy,
            'sub_tax_category_id' => $subTaxCategory->id,
            'sub_category_name' => $subTaxCategory->name,
            'saved_count' => $saved->count(),
            'existing_count' => $existing->count(),
            'saved' => $saved->values(),
            'existing' => $existing->values(),
        ]);
    }

    private function formatRecord(SubTaxCategoryCodeModel $record): array
    {
        return [
            'id' => $record->id,
            'user_id' => $record->user_id,
            'added_by' => $record->added_by,
            'sub_tax_category_id' => $record->sub_tax_category_id,
            'code' => $record->code,
            'value' => $record->value,
            'status' => $record->status,
            'created_at' => $record->created_at,
            'updated_at' => $record->updated_at,
        ];
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id' => ['required', 'integer', 'exists:sub_tax_category_codes,id'],
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'sub_tax_category_id' => ['nullable', 'integer', 'exists:sub_tax_categories,id'],
            'code' => ['required', 'string', 'max:255'],
            'value' => ['required', 'numeric'],
            'status' => ['nullable', 'in:active,inactive'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        if (! $this->authorizeUserScope($validated['user_id'], 'tax-documents.upload')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $record = SubTaxCategoryCodeModel::find($validated['id']);

        if (! $record) {
            return $this->sendError('SUB_TAX_CATEGORY_CODE_NOT_FOUND', 404);
        }

        $subTaxCategoryId = $validated['sub_tax_category_id'] ?? $record->sub_tax_category_id;
        $code = trim((string) $validated['code']);
        $value = $validated['value'];

        $duplicate = SubTaxCategoryCodeModel::where('user_id', $validated['user_id'])
            ->where('sub_tax_category_id', $subTaxCategoryId)
            ->where('code', $code)
            ->where('value', $value)
            ->where('id', '!=', $record->id)
            ->exists();

        if ($duplicate) {
            return $this->sendError('THIS_CODE_VALUE_ALREADY_EXISTS', 409);
        }

        $record->user_id = $validated['user_id'];
        $record->added_by = $record->added_by ?? auth()->id();
        $record->sub_tax_category_id = $subTaxCategoryId;
        $record->code = $code;
        $record->value = $value;
        $record->status = $validated['status'] ?? $record->status;
        $record->save();

        return $this->sendResponse('SUB_TAX_CATEGORY_CODE_UPDATED', [
            'data' => $this->formatRecord($record),
        ]);
    }

    public function delete(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id' => ['required', 'integer', 'exists:sub_tax_category_codes,id'],
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        if (! $this->authorizeUserScope($validated['user_id'], 'tax-documents.upload')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $record = SubTaxCategoryCodeModel::find($validated['id']);

        if (! $record) {
            return $this->sendError('SUB_TAX_CATEGORY_CODE_NOT_FOUND', 404);
        }

        $record->delete();

        return $this->sendResponse('SUB_TAX_CATEGORY_CODE_DELETED', [
            'id' => (int) $validated['id'],
            'user_id' => (int) $validated['user_id'],
        ]);
    }

    public function listBySubCategory(int $sub_tax_category_id)
    {
        $subTaxCategory = SubTaxCategory::find($sub_tax_category_id);
        if (! $subTaxCategory) {
            return $this->sendError('SUBCATEGORY_NOT_FOUND', 404);
        }

        $records = SubTaxCategoryCodeModel::where('user_id', auth()->id())
            ->where('sub_tax_category_id', $sub_tax_category_id)
            ->orderBy('code')
            ->get()
            ->map(function ($record) {
                return [
                    'id' => $record->id,
                    'user_id' => $record->user_id,
                    'added_by' => $record->added_by,
                    'sub_tax_category_id' => $record->sub_tax_category_id,
                    'code' => $record->code,
                    'value' => $record->value,
                    'status' => $record->status,
                    'created_at' => $record->created_at,
                    'updated_at' => $record->updated_at,
                ];
            })
            ->values();

        return $this->sendResponse('RECORDS_FOUND', [
            'user_id' => auth()->id(),
            'sub_tax_category_id' => $subTaxCategory->id,
            'sub_category_name' => $subTaxCategory->name,
            'data' => $records,
        ]);
    }

    /**
     * Self-service aggregate: all of the authenticated taxfiler's CRA codes
     * across every sub-category, for their dashboard's CRA Codes Summary
     * widget. Mirrors the business-side Filings::reviewCodes() aggregate.
     */
    public function mySummary()
    {
        $codes = SubTaxCategoryCodeModel::with('subcategory')
            ->where('user_id', auth()->id())
            ->orderBy('sub_tax_category_id')
            ->orderBy('code')
            ->get();

        $data = $codes->map(fn ($record) => [
            'id' => $record->id,
            'sub_tax_category_id' => $record->sub_tax_category_id,
            'sub_category_code' => $record->subcategory->code ?? null,
            'sub_category_name' => $record->subcategory->name ?? null,
            'code' => $record->code,
            'value' => $record->value,
            'status' => $record->status,
        ])->values();

        return $this->sendResponse('RECORDS_FOUND', [
            'data' => $data,
            'net_total' => $codes->sum('value'),
        ]);
    }

    public function listSelected(Request $request, ?int $user_id = null, ?int $sub_tax_category_id = null)
    {
        $filters = Config::get('users.filters', [
            'results_per_page' => 15,
            'page' => 1,
            'search' => '',
            'offset' => 0,
        ]);

        $validator = Validator::make($request->all(), [
            'user_id' => [$user_id === null ? 'required' : 'nullable', 'integer', 'exists:users,id'],
            'sub_tax_category_id' => [$sub_tax_category_id === null ? 'required' : 'nullable', 'integer', 'exists:sub_tax_categories,id'],
            'search' => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric', 'gt:0'],
            'page' => ['nullable', 'numeric', 'gt:0'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $taxfilerId = $user_id ?? (int) $validated['user_id'];

        if (! $this->authorizeUserScope($taxfilerId, 'tax-documents.view')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $taxfiler = User::select('id', 'first_name', 'last_name', 'email', 'mobile')
            ->find($taxfilerId);

        if (! $taxfiler) {
            return $this->sendError('USER_NOT_FOUND', 404);
        }

        $subTaxCategoryId = $sub_tax_category_id ?? (int) $validated['sub_tax_category_id'];
        $subTaxCategory = SubTaxCategory::find($subTaxCategoryId);

        if (! $subTaxCategory) {
            return $this->sendError('SUBCATEGORY_NOT_FOUND', 404);
        }

        $search = $validated['search'] ?? $filters['search'];
        $results_per_page = (int) ($validated['results_per_page'] ?? $filters['results_per_page']);
        $page = (int) ($validated['page'] ?? $filters['page']);
        $offset = ($page - 1) * $results_per_page;

        $query = SubTaxCategoryCodeModel::with('subcategory')
            ->where('user_id', $taxfilerId)
            ->where('sub_tax_category_id', $subTaxCategoryId)
            ->when($search !== null && $search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('code', 'like', "%{$search}%")
                        ->orWhere('value', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhereHas('subcategory', function ($categoryQuery) use ($search) {
                            $categoryQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%");
                        });
                });
            })
            ->orderBy('sub_tax_category_id')
            ->orderBy('code');

        $total_results = $query->count();
        $max = (int) ceil($total_results / $results_per_page);

        $records = $query
            ->limit($results_per_page)
            ->offset($offset)
            ->get()
            ->map(function ($record) {
                return [
                    'id' => $record->id,
                    'user_id' => $record->user_id,
                    'added_by' => $record->added_by,
                    'sub_tax_category_id' => $record->sub_tax_category_id,
                    'sub_category_code' => $record->subcategory->code ?? null,
                    'sub_category_name' => $record->subcategory->name ?? null,
                    'code' => $record->code,
                    'value' => $record->value,
                    'status' => $record->status,
                    'created_at' => $record->created_at,
                    'updated_at' => $record->updated_at,
                ];
            })
            ->values();

        return $this->sendResponse('RECORDS_FOUND', [
            'taxfiler' => $taxfiler,
            'user_id' => $taxfilerId,
            'sub_tax_category_id' => $subTaxCategory->id,
            'sub_category_code' => $subTaxCategory->code,
            'sub_category_name' => $subTaxCategory->name,
            'meta' => [
                'first_page' => 1,
                'last_page' => max($max, 1),
                'current_page' => $page,
                'num_results' => $records->count(),
                'total_results' => $total_results,
            ],
            'data' => $records,
        ]);
    }
}
