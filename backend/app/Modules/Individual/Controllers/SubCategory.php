<?php

namespace App\Modules\Individual\Controllers;

use App\Http\Controllers\BaseController;
use App\Modules\Individual\Models\SubTaxCategory;
use App\Modules\Individual\Models\TaxFilerDocument;
use App\Modules\Individual\Models\UserTaxCategory;
use Illuminate\Support\Facades\Config;
use Illuminate\Http\Request;
use Validator;

class SubCategory extends BaseController 
{
    protected function formatDocument($doc): array
    {
        return [
            'id' => $doc->id,
            'user_id' => $doc->user_id,
            'year' => $doc->year,
            'sub_tax_category_id' => $doc->sub_tax_category_id,
            'file_id' => $doc->file_id,
            'file_name' => $doc->file->file_name ?? null,
            'file_path' => $doc->file->file_path ?? null,
            'file_size' => $doc->file->file_size ?? null,
            'status' => $doc->status,
            'comments' => $doc->comments,
            'month' => $doc->month,
            'uploaded_by' => $doc->uploaded_by,
            'created_at' => $doc->created_at,
        ];
    }

    /**
     * Get all subcategories (forms) by category
     */
    public function getByCategory(Request $request, $categoryId)
    {
        $filters = Config::get('users.filters', [
            'results_per_page' => 15,
            'page' => 1,
            'search' => '',
            'offset' => 0,
        ]);

        $validator = Validator::make($request->all(), [
            'year' => ['nullable', 'digits:4'],
            'search' => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric', 'gt:0'],
            'page' => ['nullable', 'numeric', 'gt:0'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $year = $validated['year'] ?? null;
        $search = $validated['search'] ?? $filters['search'];
        $results_per_page = (int) ($validated['results_per_page'] ?? $filters['results_per_page']);
        $page = (int) ($validated['page'] ?? $filters['page']);
        $offset = ($page - 1) * $results_per_page;

        $userTaxCategories = UserTaxCategory::query()
            ->where('user_id', auth()->id())
            ->where('tax_category_id', $categoryId)
            ->when($year !== null && $year !== '', function ($query) use ($year) {
                $query->where('year', $year);
            })
            ->orderByDesc('id')
            ->get(['id', 'year']);

        $years = $userTaxCategories->pluck('year')->filter()->unique()->values();

        $subcategoriesQuery = SubTaxCategory::query()
            ->whereHas('categories', function ($q) use ($categoryId) {
                $q->where('tax_category_id', $categoryId);
            })
            ->when($search !== null && $search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->orderBy('name');

        $total_results = $subcategoriesQuery->count();
        $max = (int) ceil($total_results / $results_per_page);
        $subcategories = $subcategoriesQuery
            ->limit($results_per_page)
            ->offset($offset)
            ->get();

        $documentsBySubcategory = TaxFilerDocument::with('file')
            ->where('user_id', auth()->id())
            ->when($years->isNotEmpty(), function ($query) use ($years) {
                $query->whereIn('year', $years);
            }, function ($query) {
                $query->whereRaw('1 = 0');
            })
            ->whereIn('sub_tax_category_id', $subcategories->pluck('id'))
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('sub_tax_category_id');

        $data = $subcategories->map(function ($subCategory) use ($documentsBySubcategory, $userTaxCategories) {
            $documents = ($documentsBySubcategory->get($subCategory->id) ?? collect())
                ->map(fn ($doc) => $this->formatDocument($doc))
                ->values();

            return [
                'id' => $subCategory->id,
                'code' => $subCategory->code,
                'name' => $subCategory->name,
                'description' => $subCategory->description,
                'status' => $subCategory->status,
                'taxpayer_type' => $subCategory->taxpayer_type,
                'aliases' => $subCategory->aliases,
                'created_at' => $subCategory->created_at,
                'updated_at' => $subCategory->updated_at,
                'user_tax_category_ids' => $userTaxCategories->pluck('id')->values(),
                'documents' => $documents,
            ];
        })->values();

        return $this->sendResponse('RECORDS_FOUND', [
            'meta' => [
                'first_page' => 1,
                'last_page' => max($max, 1),
                'current_page' => $page,
                'num_results' => $data->count(),
                'total_results' => $total_results,
            ],
            'data' => $data,
        ]);
    }

    /**
     * Get subcategories for one saved user tax category, with upload context.
     */
    public function getByUserTaxCategory(int $userTaxCategoryId)
    {
        $userTaxCategory = UserTaxCategory::with('taxCategory')
            ->where('user_id', auth()->id())
            ->find($userTaxCategoryId);

        if (! $userTaxCategory) {
            return $this->sendError('USER_TAX_CATEGORY_NOT_FOUND');
        }

        $subcategories = SubTaxCategory::whereHas('categories', function ($query) use ($userTaxCategory) {
            $query->where('tax_category_id', $userTaxCategory->tax_category_id);
        })->get();

        $documentsBySubcategory = TaxFilerDocument::with('file')
            ->where('user_id', $userTaxCategory->user_id)
            ->where('year', $userTaxCategory->year)
            ->whereIn('sub_tax_category_id', $subcategories->pluck('id'))
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('sub_tax_category_id');

        $data = $subcategories->map(function ($subCategory) use ($userTaxCategory, $documentsBySubcategory) {
            $documents = ($documentsBySubcategory->get($subCategory->id) ?? collect())
                ->map(fn ($doc) => $this->formatDocument($doc))
                ->values();

            return [
                'user_tax_category_id' => $userTaxCategory->id,
                'tax_category_id' => $userTaxCategory->tax_category_id,
                'category_name' => $userTaxCategory->taxCategory->name ?? null,
                'year' => $userTaxCategory->year,
                'sub_tax_category_id' => $subCategory->id,
                'sub_category_code' => $subCategory->code,
                'sub_category_name' => $subCategory->name,
                'description' => $subCategory->description,
                'status' => $subCategory->status,
                'has_uploaded_documents' => $documents->isNotEmpty(),
                'document_count' => $documents->count(),
                'documents' => $documents,
            ];
        })->values();

        return $this->sendResponse('RECORDS_FOUND', [
            'user_tax_category_id' => $userTaxCategory->id,
            'tax_category_id' => $userTaxCategory->tax_category_id,
            'category_name' => $userTaxCategory->taxCategory->name ?? null,
            'year' => $userTaxCategory->year,
            'data' => $data,
        ]);
    }
}
