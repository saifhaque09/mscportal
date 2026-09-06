<?php

namespace App\Modules\Individual\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Validator;

use App\Http\Controllers\BaseController;
use App\Modules\Individual\Models\SubTaxCategory;
use App\Modules\Individual\Models\TaxCategory;
use App\Modules\Individual\Models\UserTaxCategory;
use App\Modules\Individual\Models\UserStatusSubTaxCategory;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Notifications\Models\Notification;

class Category  extends BaseController
{

        // ✅ CREATE
    public function create(Request $request)
{
    if (! auth()->user()->can('tax-categories.manage')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $request->validate([
        'name' => 'required|string|max:255',
        'code' => 'required|string|max:255|unique:tax_categories,code',
        'description' => 'required|string'
    ]);

    $category = TaxCategory::create([
        'name' => $request->name,
        'code' => strtoupper($request->code),
        'description' => $request->description
    ]);

    return $this->sendResponse('CATEGORY_CREATED', $category);
}

    // ✅ EDIT
public function edit(Request $request, $id)
{
    if (! auth()->user()->can('tax-categories.manage')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $category = TaxCategory::findOrFail($id);

    $request->validate([
        'name' => 'required|string|max:255',
        'code' => 'required|string|max:255|unique:tax_categories,code,' . $id,
        'description' => 'required|string'
    ]);

    $category->update([
        'name' => $request->name,
        'code' => strtoupper($request->code),
        'description' => $request->description
    ]);

    return $this->sendResponse('CATEGORY_UPDATED', $category);
}
// ✅ DELETE
public function delete(Request $request)
{
    if (! auth()->user()->can('tax-categories.manage')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $request->validate([
        'id' => 'required|exists:tax_categories,id'
    ]);

    TaxCategory::where('id', $request->id)->delete();

    return $this->sendResponse('CATEGORY_DELETED');
}
    // ✅ 1. List all categories
    public function getAll()
    {
        $categories = TaxCategory::where('status', 'active')->get();

        return $this->sendResponse('RECORDS_FOUND', [
            'data' => $categories
        ]);
    }

    // ✅ 2. Save user-specific categories

public function saveUserCategories(Request $request)
{
    $request->validate([
        'category_ids' => 'required|array',
        'category_ids.*' => 'exists:tax_categories,id',
        'year' => 'required|digits:4'
    ]);

    $user = \Auth::user();

    $alreadyExists = [];
    $added = [];

    foreach ($request->category_ids as $id) {

        // ✅ Check if already exists
        $exists = $user->taxCategories()
            ->where('tax_category_id', $id)
            ->wherePivot('year', $request->year)
            ->exists();

        if ($exists) {
            $alreadyExists[] = $id;
        } else {
            // ✅ attach with pivot data
            $user->taxCategories()->attach($id, [
                'year' => $request->year,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $added[] = $id;
        }
    }

    // ✅ Custom response messages
    if (!empty($alreadyExists) && empty($added)) {
        return $this->sendResponse('ALREADY_ADDED', [
            'category_ids' => $alreadyExists
        ]);
    }

    ActivityLog::record('taxfiler', 'add tax Categories', null, auth()->id());

    Notification::record(
        $user->id,
        'Tax categories added',
        "Your tax categories have been added for {$request->year}.",
        'tax_category_added'
    );

    if (!empty($alreadyExists)) {
        return $this->sendResponse('PARTIALLY_SAVED', [
            'added' => $added,
            'already_exists' => $alreadyExists
        ]);
    }

    return $this->sendResponse('CATEGORIES_SAVED', [
        'added' => $added
    ]);
}

public function updateUserCategories(Request $request)
{
    if (is_string($request->category_ids)) {
        $request->merge([
            'category_ids' => array_filter(explode(',', $request->category_ids)),
        ]);
    }

    $request->validate([
        'category_ids' => 'required|array',
        'category_ids.*' => 'exists:tax_categories,id',
        'year' => 'required|digits:4'
    ]);

    $user = Auth::user();
    $categoryIds = collect($request->category_ids)
        ->map(fn ($id) => (int) $id)
        ->unique()
        ->values();

    $existingCategoryIds = UserTaxCategory::where('user_id', $user->id)
        ->where('year', $request->year)
        ->pluck('tax_category_id')
        ->map(fn ($id) => (int) $id)
        ->values();

    $removed = $existingCategoryIds->diff($categoryIds)->values();
    $added = $categoryIds->diff($existingCategoryIds)->values();
    $kept = $existingCategoryIds->intersect($categoryIds)->values();

    DB::transaction(function () use ($user, $request, $categoryIds) {
        $deleteQuery = UserTaxCategory::where('user_id', $user->id)
            ->where('year', $request->year);

        if ($categoryIds->isNotEmpty()) {
            $deleteQuery->whereNotIn('tax_category_id', $categoryIds->all());
        }

        $deleteQuery->delete();

        foreach ($categoryIds as $categoryId) {
            UserTaxCategory::firstOrCreate([
                'user_id' => $user->id,
                'tax_category_id' => $categoryId,
                'year' => $request->year,
            ]);
        }
    });

    if ($added->isNotEmpty() || $removed->isNotEmpty()) {
        ActivityLog::record('taxfiler', 'Updated tax Categories', null, auth()->id());

        Notification::record(
            $user->id,
            'Tax categories updated',
            "Your tax categories have been updated for {$request->year}.",
            'tax_category_updated'
        );
    }

    $updated = UserTaxCategory::with('taxCategory')
        ->where('user_id', $user->id)
        ->where('year', $request->year)
        ->orderByDesc('id')
        ->get()
        ->map(function ($userTaxCategory) {
            return [
                'id' => $userTaxCategory->id,
                'tax_category_id' => $userTaxCategory->tax_category_id,
                'category_name' => $userTaxCategory->taxCategory->name ?? null,
                'category_code' => $userTaxCategory->taxCategory->code ?? null,
                'year' => $userTaxCategory->year,
                'status' => $userTaxCategory->status ?? null,
                'created_at' => $userTaxCategory->created_at,
                'updated_at' => $userTaxCategory->updated_at,
            ];
        })
        ->values();

    return $this->sendResponse('CATEGORIES_UPDATED', [
        'year' => $request->year,
        'added' => $added,
        'removed' => $removed,
        'kept' => $kept,
        'data' => $updated,
    ]);
}

    // ✅ 3. Get user-specific categories
    public function getUserCategories(Request $request)
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
        return $this->sendError($validator->errors());
    }

    $validated = $validator->validated();
    $user = Auth::user();
    $year = $validated['year'] ?? null;
    $search = $validated['search'] ?? $filters['search'];
    $results_per_page = (int) ($validated['results_per_page'] ?? $filters['results_per_page']);
    $page = (int) ($validated['page'] ?? $filters['page']);
    $offset = ($page - 1) * $results_per_page;

    $userTaxCategories = UserTaxCategory::query()
        ->where('user_id', $user->id)
        ->orderByDesc('id');

    if ($year !== null && $year !== '') {
        $userTaxCategories->where('year', $year);
    }

    $userTaxCategories = $userTaxCategories->get([
        'id',
        'user_id',
        'tax_category_id',
        'year',
        'created_at',
        'updated_at',
    ]);

    if ($userTaxCategories->isEmpty()) {
        return $this->sendError('RECORDS_NOT_FOUND', 200);
    }

    $taxCategoryIds = $userTaxCategories->pluck('tax_category_id')->unique()->values();
    $taxCategoryIdsByUser = $userTaxCategories
        ->groupBy('tax_category_id')
        ->map(fn ($items) => $items->pluck('tax_category_id')->unique()->values());

    $subCategoriesQuery = SubTaxCategory::query()
        ->whereHas('categories', function ($query) use ($taxCategoryIds) {
            $query->whereIn('tax_categories.id', $taxCategoryIds);
        })
        ->when($search !== null && $search !== '', function ($query) use ($search) {
            $query->where(function ($subQuery) use ($search) {
                $subQuery->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        })
        ->with([
            'categories' => function ($query) use ($taxCategoryIds) {
                $query->whereIn('tax_categories.id', $taxCategoryIds)
                    ->select('tax_categories.id', 'tax_categories.name', 'tax_categories.code');
            },
            'documents' => function ($query) use ($user, $year) {
                $query->where('user_id', $user->id);

                if ($year !== null && $year !== '') {
                    $query->where('year', $year);
                }

                $query->with('file')->orderByDesc('created_at');
            }
        ])
        ->orderBy('name');

    $total_results = $subCategoriesQuery->count();
    $max = (int) ceil($total_results / $results_per_page);

    $subCategories = $subCategoriesQuery
        ->limit($results_per_page)
        ->offset($offset)
        ->get();

    $subCategoryIds = $subCategories->pluck('id')->toArray();
    $lockStatusQuery = UserStatusSubTaxCategory::where('user_id', $user->id)
        ->whereIn('sub_tax_category_id', $subCategoryIds);
    if ($year !== null && $year !== '') {
        $lockStatusQuery->where('year', $year);
    }
    $lockStatuses = $lockStatusQuery->pluck('status', 'sub_tax_category_id');

    $records = $subCategories
        ->map(function ($subCategory) use ($taxCategoryIdsByUser, $year, $lockStatuses) {
            $mappedCategoryIds = $subCategory->categories
                ->flatMap(function ($category) use ($taxCategoryIdsByUser) {
                    return $taxCategoryIdsByUser->get($category->id, collect());
                })
                ->unique()
                ->values();

            return [
                'id' => $subCategory->id,
                'code' => $subCategory->code,
                'name' => $subCategory->name,
                'description' => $subCategory->description,
                'status' => $subCategory->status,
                'lock_status' => $lockStatuses->get($subCategory->id, 'unlocked'),
                'taxpayer_type' => $subCategory->taxpayer_type,
                'aliases' => $subCategory->aliases,
                'user_id' => Auth::id(),
                'year' => $year,
                'document_names' => $subCategory->documents
                    ->map(fn ($document) => $document->file->file_name ?? null)
                    ->filter()
                    ->values(),
                'documents' => $subCategory->documents
                    ->map(function ($document) {
                        $filePath = $document->file
                            ? $document->file->getRawOriginal('file_path')
                            : null;

                        return [
                            'id' => $document->id,
                            'file_id' => $document->file_id,
                            'file_name' => $document->file->file_name ?? null,
                            'file_url' => $filePath ? Storage::disk('s3')->temporaryUrl($filePath, now()->addMinutes(2)) : null,
                            'file_path' => $filePath,
                            'file_size' => $document->file->file_size ?? null,
                            'status' => $document->status,
                            'comments' => $document->comments,
                            'month' => $document->month,
                            'uploaded_by' => $document->uploaded_by,
                            'created_at' => $document->created_at,
                        ];
                    })
                    ->values(),
                'tax_category_ids' => $mappedCategoryIds,
                'categories' => $subCategory->categories
                    ->map(function ($category) {
                        return [
                            'id' => $category->id,
                            'name' => $category->name,
                            'code' => $category->code,
                        ];
                    })
                    ->values(),
                'created_at' => $subCategory->created_at,
                'updated_at' => $subCategory->updated_at,
            ];
        })
        ->values();

    $num_results = $records->count();
    $payload = [
        'meta' => [
            'first_page' => 1,
            'last_page' => max($max, 1),
            'current_page' => $page,
            'num_results' => $num_results,
            'total_results' => $total_results,
        ],
        'data' => $records,
    ];

    // An empty result set is a valid, successful response — not an error —
    // so the frontend doesn't have to special-case it to avoid showing a
    // spurious "failed to fetch" notification.
    return $this->sendResponse('RECORDS_FOUND', $payload);
}

public function getSelectedUserCategories(Request $request)
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
    $user = Auth::user();
    $year = $validated['year'] ?? null;
    $search = $validated['search'] ?? $filters['search'];
    $results_per_page = (int) ($validated['results_per_page'] ?? $filters['results_per_page']);
    $page = (int) ($validated['page'] ?? $filters['page']);
    $offset = ($page - 1) * $results_per_page;

    $query = UserTaxCategory::with('taxCategory')
        ->where('user_id', $user->id)
        ->when($year !== null && $year !== '', function ($query) use ($year) {
            $query->where('year', $year);
        })
        ->when($search !== null && $search !== '', function ($query) use ($search) {
            $query->whereHas('taxCategory', function ($categoryQuery) use ($search) {
                $categoryQuery->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        })
        ->orderByDesc('id');

    $total_results = $query->count();
    $max = (int) ceil($total_results / $results_per_page);

    $records = $query
        ->limit($results_per_page)
        ->offset($offset)
        ->get()
        ->filter(fn ($userTaxCategory) => $userTaxCategory->taxCategory !== null)
        ->map(function ($userTaxCategory) {
            return [
                'user_tax_category_id' => $userTaxCategory->id,
                'tax_category_id' => $userTaxCategory->tax_category_id,
                'name' => $userTaxCategory->taxCategory->name,
                'code' => $userTaxCategory->taxCategory->code,
                'description' => $userTaxCategory->taxCategory->description,
                'category_status' => $userTaxCategory->taxCategory->status,
                'year' => $userTaxCategory->year,
                'status' => $userTaxCategory->status ?? null,
                'created_at' => $userTaxCategory->created_at,
                'updated_at' => $userTaxCategory->updated_at,
            ];
        })
        ->values();

    $num_results = $records->count();

    if ($num_results === 0) {
        return $this->sendError('RECORDS_NOT_FOUND', 200);
    }

    return $this->sendResponse('RECORDS_FOUND', [
        'meta' => [
            'first_page' => 1,
            'last_page' => max($max, 1),
            'current_page' => $page,
            'num_results' => $num_results,
            'total_results' => $total_results,
        ],
        'data' => $records,
    ]);
}

    public function getTaxfilerCategories(Request $request)
{
    $filters = Config::get('users.filters', [
        'results_per_page' => 15,
        'page' => 1,
        'search' => '',
        'offset' => 0,
    ]);

    $validator = Validator::make($request->all(), [
        'user_id' => ['required', 'exists:users,id'],
        'year' => ['nullable', 'digits:4'],
        'search' => ['nullable', 'string'],
        'results_per_page' => ['nullable', 'numeric', 'gt:0'],
        'page' => ['nullable', 'numeric', 'gt:0'],
    ]);

    if ($validator->fails()) {
        return $this->sendError($validator->errors());
    }

    $validated = $validator->validated();

    if (! $this->authorizeUserScope($validated['user_id'], 'tax-documents.view')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $year = $validated['year'] ?? null;
    $search = $validated['search'] ?? $filters['search'];
    $results_per_page = (int) ($validated['results_per_page'] ?? $filters['results_per_page']);
    $page = (int) ($validated['page'] ?? $filters['page']);
    $offset = ($page - 1) * $results_per_page;

    $userTaxCategories = UserTaxCategory::query()
        ->where('user_id', $validated['user_id'])
        ->orderByDesc('id');

    if ($year !== null && $year !== '') {
        $userTaxCategories->where('year', $year);
    }

    $userTaxCategories = $userTaxCategories->get([
        'id',
        'user_id',
        'tax_category_id',
        'year',
        'created_at',
        'updated_at',
    ]);

    if ($userTaxCategories->isEmpty()) {
        return $this->sendError('RECORDS_NOT_FOUND', 200);
    }

    $taxCategoryIds = $userTaxCategories->pluck('tax_category_id')->unique()->values();
    $taxCategoryIdsByUser = $userTaxCategories
        ->groupBy('tax_category_id')
        ->map(fn ($items) => $items->pluck('tax_category_id')->unique()->values());

    $subCategoriesQuery = SubTaxCategory::query()
        ->whereHas('categories', function ($query) use ($taxCategoryIds) {
            $query->whereIn('tax_categories.id', $taxCategoryIds);
        })
        ->when($search !== null && $search !== '', function ($query) use ($search) {
            $query->where(function ($subQuery) use ($search) {
                $subQuery->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        })
        ->with([
            'categories' => function ($query) use ($taxCategoryIds) {
                $query->whereIn('tax_categories.id', $taxCategoryIds)
                    ->select('tax_categories.id', 'tax_categories.name', 'tax_categories.code');
            }
        ])
        ->withCount([
            'documents as document_count' => function ($query) use ($validated, $year) {
                $query->where('user_id', $validated['user_id']);

                if ($year !== null && $year !== '') {
                    $query->where('year', $year);
                }
            }
        ])
        ->orderBy('name');

    $total_results = $subCategoriesQuery->count();
    $max = (int) ceil($total_results / $results_per_page);
    $records = $subCategoriesQuery
        ->limit($results_per_page)
        ->offset($offset)
        ->get()
        ->map(function ($subCategory) use ($taxCategoryIdsByUser, $validated, $year) {
            $mappedCategoryIds = $subCategory->categories
                ->flatMap(function ($category) use ($taxCategoryIdsByUser) {
                    return $taxCategoryIdsByUser->get($category->id, collect());
                })
                ->unique()
                ->values();

            return [
                'id' => $subCategory->id,
                'code' => $subCategory->code,
                'name' => $subCategory->name,
                'description' => $subCategory->description,
                'status' => $subCategory->status,
                'taxpayer_type' => $subCategory->taxpayer_type,
                'aliases' => $subCategory->aliases,
                'user_id' => (int) $validated['user_id'],
                'year' => $year,
                'document_count' => (int) $subCategory->document_count,
                'tax_category_ids' => $mappedCategoryIds,
                'categories' => $subCategory->categories
                    ->map(function ($category) {
                        return [
                            'id' => $category->id,
                            'name' => $category->name,
                            'code' => $category->code,
                        ];
                    })
                    ->values(),
                'created_at' => $subCategory->created_at,
                'updated_at' => $subCategory->updated_at,
            ];
        })
        ->values();

    $num_results = $records->count();
    $payload = [
        'meta' => [
            'first_page' => 1,
            'last_page' => max($max, 1),
            'current_page' => $page,
            'num_results' => $num_results,
            'total_results' => $total_results,
        ],
        'data' => $records,
    ];

    // An empty result set is a valid, successful response — not an error —
    // so the frontend doesn't have to special-case it to avoid showing a
    // spurious "failed to fetch" notification.
    return $this->sendResponse('RECORDS_FOUND', $payload);
}
}
