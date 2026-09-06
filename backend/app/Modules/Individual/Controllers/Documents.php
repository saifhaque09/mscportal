<?php

namespace App\Modules\Individual\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use App\Http\Controllers\BaseController;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Support\Arr;
use Validator;

use App\Helpers\Guid;
use App\Models\User;

use App\Modules\Files\Controllers\Files;
use App\Modules\Files\Controllers\Checklists;
use App\Modules\Files\Models\File As FileModel;
use App\Modules\Files\Models\FileLog;
use App\Modules\Individual\Models\SubTaxCategory;
use App\Modules\Individual\Models\TaxCategory;
use App\Modules\Individual\Models\UserTaxCategory;
use App\Modules\Individual\Models\TaxFilerDocument;
use App\Modules\Individual\Models\UserStatusSubTaxCategory;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Notifications\Models\Notification;


class Documents extends BaseController {

    /**
     * Upload attachments
     */
public function upload(Request $request)
{
    // Validate input
    $rules = [
        'sub_tax_category_id' => ['required', 'exists:sub_tax_categories,id'],
        'year' => ['required', 'digits:4'],
        'document' => ['required'],
        'alt' => ["nullable", 'string', 'max:100'],
        'title' => ["nullable", 'string', 'max:100'],
        'month' => ["nullable", 'between:1,12'],
    ];

    $max = Config::get('files.max_upload_size');
    $allowed = Config::get('files.allowed_types');
    $allowed = collect($allowed)->flatten()->toArray();

    $rules['document'][] = File::types($allowed)->max($max);

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails()) {
        return $this->sendError($validator->errors());
    }

    $validated = $validator->validated();

    $user = auth()->user();

    $subTaxCategory = SubTaxCategory::find($validated['sub_tax_category_id']);

    if (! $subTaxCategory) {
        return $this->sendError('SUBCATEGORY_NOT_FOUND');
    }

    $group = 'tax_filer';
    $path = 'tax_filer/user_' . $user->id
        . '/year_' . $validated['year']
        . '/subcategory_' . $subTaxCategory->id;

    if ($request->file('document')->isValid()) {

        $files = new Files();
        $uploadedFile = $request->file('document');

        $extension = $uploadedFile->extension();
        $name = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
        $file_name = Str::slug($name) . '.' . $extension;

        // ✅ Prepare duplicate check values
        $fileSize = $uploadedFile->getSize();
        $fullPath = $path . '/' . $file_name;

        // 🔴 DUPLICATE CHECK (file_size + file_path)
        $exists = FileModel::where('file_size', $fileSize)
    ->where('file_path', $fullPath)
    ->exists();

        if ($exists) {
            return $this->sendError('THIS_FILE_ALREADY_UPLOADED');
        }

        // Store file
        $data = $files->store($request, $uploadedFile, $group, $file_name, $path);

        // Save tax filer document record
        TaxFilerDocument::create([
            'user_id' => $user->id,
            'year' => $validated['year'],
            'sub_tax_category_id' => $subTaxCategory->id,
            'file_id' => $data['file_id'],
            'uploaded_by' => $user->id,
            'status' => 'pending',
            'comments' => '',
            'month' => $validated['month'] ?? date('n'),
        ]);

        UserStatusSubTaxCategory::firstOrCreate(
            [
                'user_id' => $user->id,
                'year' => $validated['year'],
                'sub_tax_category_id' => $subTaxCategory->id,
            ],
            [
                'status' => 'unlocked',
            ]
        );

        ActivityLog::record('documents', "Uploaded document for {$subTaxCategory->name} sub tax category", $data['file_id'], $user->id);

        return $this->sendResponse('FILES_UPLOADED', $data);
    }

    return $this->sendError('FILE_UPLOAD_FAILED');
}

public function uploadIncomeTaxReturn(Request $request, int $user_id)
{
    if (! $this->authorizeUserScope($user_id, 'tax-documents.upload')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $rules = [
        'year' => ['required', 'digits:4'],
        'document' => ['required'],
        'alt' => ['nullable', 'string', 'max:100'],
        'title' => ['nullable', 'string', 'max:100'],
        'month' => ['nullable', 'between:1,12'],
        'comments' => ['nullable', 'string'],
        'status' => ['nullable', Rule::in(['pending', 'approved', 'reupload'])],
    ];

    $max = Config::get('files.max_upload_size');
    $allowed = Config::get('files.allowed_types');
    $allowed = collect($allowed)->flatten()->toArray();

    $rules['document'][] = File::types($allowed)->max($max);

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails()) {
        return $this->sendError($validator->errors(), 422);
    }

    $validated = $validator->validated();
    $taxfiler = User::select('id', 'first_name', 'last_name', 'email', 'mobile')
        ->find($user_id);

    if (! $taxfiler) {
        return $this->sendError('USER_NOT_FOUND', 404);
    }

    if (! $request->file('document')->isValid()) {
        return $this->sendError('FILE_UPLOAD_FAILED');
    }

    $group = 'tax_filer';
    $path = 'tax_filer/user_' . $taxfiler->id
        . '/year_' . $validated['year']
        . '/income_tax_return';

    $files = new Files();
    $uploadedFile = $request->file('document');

    $extension = $uploadedFile->extension();
    $name = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
    $file_name = Str::slug($name) . '.' . $extension;

    $fileSize = $uploadedFile->getSize();
    $fullPath = $path . '/' . $file_name;

    $exists = FileModel::where('file_size', $fileSize)
        ->where('file_path', $fullPath)
        ->exists();

    if ($exists) {
        return $this->sendError('THIS_FILE_ALREADY_UPLOADED');
    }

    $data = $files->store($request, $uploadedFile, $group, $file_name, $path);

    $document = TaxFilerDocument::create([
        'user_id' => $taxfiler->id,
        'year' => $validated['year'],
        'sub_tax_category_id' => null,
        'file_id' => $data['file_id'],
        'document_type' => 'income_tax_return',
        'uploaded_by' => auth()->id(),
        'status' => $validated['status'] ?? 'pending',
        'comments' => $validated['comments'] ?? '',
        'month' => $validated['month'] ?? date('n'),
    ]);

    return $this->sendResponse('INCOME_TAX_RETURN_UPLOADED', [
        'taxfiler' => $taxfiler,
        'document' => [
            'id' => $document->id,
            'user_id' => $document->user_id,
            'year' => $document->year,
            'sub_tax_category_id' => $document->sub_tax_category_id,
            'file_id' => $document->file_id,
            'document_type' => $document->document_type,
            'status' => $document->status,
            'comments' => $document->comments,
            'month' => $document->month,
            'uploaded_by' => $document->uploaded_by,
            'created_at' => $document->created_at,
        ],
        'file' => $data,
    ]);
}

public function completeSubCategoryUpload(Request $request)
{
    $validator = Validator::make($request->all(), [
        'sub_tax_category_id' => ['required', 'exists:sub_tax_categories,id'],
        'year' => ['required', 'digits:4'],
        'status' => ['nullable', Rule::in(['locked', 'unlocked'])],
    ]);

    if ($validator->fails()) {
        return $this->sendError($validator->errors());
    }

    $validated = $validator->validated();
    $user = auth()->user();

    $subTaxCategory = SubTaxCategory::find($validated['sub_tax_category_id']);

    if (! $subTaxCategory) {
        return $this->sendError('SUBCATEGORY_NOT_FOUND');
    }

    $status = UserStatusSubTaxCategory::where('user_id', $user->id)
        ->where('year', $validated['year'])
        ->where('sub_tax_category_id', $subTaxCategory->id)
        ->first();

    if (! $status) {
        return $this->sendError('SUBCATEGORY_STATUS_NOT_FOUND');
    }

    if ($status->sub_tax_category_id !== (int) $validated['sub_tax_category_id']) {
        return $this->sendError('SUBCATEGORY_ID_MISMATCH');
    }

    $newStatus = $validated['status'] ?? 'locked';

    if ($status->status !== $newStatus) {
        $status->status = $newStatus;
        $status->save();
    }

    return $this->sendResponse('STATUS_UPDATED', [
        'id' => $status->id,
        'user_id' => $status->user_id,
        'year' => $status->year,
        'sub_tax_category_id' => $status->sub_tax_category_id,
        'status' => $status->status,
        'updated_at' => $status->updated_at,
    ]);
}


public function listTaxDocuments($sub_tax_category_id)
{
    // Check subcategory exists
    $subTaxCategory = SubTaxCategory::find($sub_tax_category_id);

    if (! $subTaxCategory) {
        return $this->sendError('SUBCATEGORY_NOT_FOUND');
    }

    $user = auth()->user();

    // Get documents with file details
    $documents = TaxFilerDocument::with(['file', 'subTaxCategory'])
        ->where('user_id', $user->id)
        ->where('sub_tax_category_id', $subTaxCategory->id)
        ->orderBy('created_at', 'desc')
        ->get();

    // Format response
    $data = $documents->map(function ($doc) {
        $filePath = $doc->file
            ? $doc->file->getRawOriginal('file_path')
            : null;

        return [
            'id' => $doc->id,
            'user_id' => $doc->user_id,
            'year' => $doc->year,
            'file_id' => $doc->file_id,
            'file_name' => $doc->file->file_name ?? null,
            'file_hash' => $doc->file->file_hash ?? null,
            'file_path' => $filePath ? Storage::disk('s3')->temporaryUrl($filePath, now()->addMinutes(2)) : null,
            'file_size' => $doc->file->file_size ?? null,
            'title' => $doc->file->title ?? null,
            'sub_tax_category_id' => $doc->sub_tax_category_id,
            'sub_category_name' => $doc->subTaxCategory->name ?? null,
            'status' => $doc->status,
            'comments' => $doc->comments,
            'month' => $doc->month,
            'uploaded_by' => $doc->uploaded_by,
            'created_at' => $doc->created_at,
        ];
    });

    return $this->sendResponse('RECORDS_FOUND', [
        'sub_tax_category_id' => $subTaxCategory->id,
        'sub_category_name' => $subTaxCategory->name,
        'data' => $data
    ]);
}

public function downloadSubcategoryDocumentsZip(Request $request, int $sub_tax_category_id)
{
    $validator = Validator::make($request->all(), [
        'year' => ['nullable', 'digits:4'],
    ]);

    if ($validator->fails()) {
        return $this->sendError($validator->errors());
    }

    $subTaxCategory = SubTaxCategory::find($sub_tax_category_id);

    if (! $subTaxCategory) {
        return $this->sendError('SUBCATEGORY_NOT_FOUND');
    }

    $validated = $validator->validated();
    $disk = Storage::disk('s3');

    $documents = TaxFilerDocument::with('file')
        ->where('user_id', auth()->id())
        ->where('sub_tax_category_id', $subTaxCategory->id)
        ->when(! empty($validated['year']), function ($query) use ($validated) {
            $query->where('year', $validated['year']);
        })
        ->orderByDesc('created_at')
        ->get()
        ->filter(fn ($document) => $document->file !== null);

    if ($documents->isEmpty()) {
        return $this->sendError('DOCUMENTS_NOT_FOUND');
    }

    $zipDirectory = storage_path('app/temp');
    if (! is_dir($zipDirectory)) {
        mkdir($zipDirectory, 0755, true);
    }

    $zipName = 'taxcategory_' . $subTaxCategory->id . '_documents_' . now()->format('YmdHis') . '.zip';
    $zipPath = $zipDirectory . '/' . $zipName;
    $zip = new \ZipArchive();

    if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
        return $this->sendError('ZIP_CREATION_FAILED');
    }

    $temporaryFiles = [];
    $added = 0;
    $usedNames = [];

    foreach ($documents as $document) {
        $filePath = $document->file->getRawOriginal('file_path');

        if (! $filePath || ! $disk->exists($filePath)) {
            continue;
        }

        $stream = $disk->readStream($filePath);

        if (! $stream) {
            continue;
        }

        $temporaryPath = tempnam($zipDirectory, 'zip_doc_');
        $temporaryFile = fopen($temporaryPath, 'w');

        if ($temporaryFile === false) {
            if (is_resource($stream)) {
                fclose($stream);
            }
            continue;
        }

        stream_copy_to_stream($stream, $temporaryFile);

        if (is_resource($stream)) {
            fclose($stream);
        }

        fclose($temporaryFile);
        $temporaryFiles[] = $temporaryPath;

        $zipEntryName = $document->file->file_name ?: basename($filePath);
        $zipEntryName = $this->uniqueZipEntryName($zipEntryName, $usedNames);

        if ($zip->addFile($temporaryPath, $zipEntryName)) {
            $added++;
        }
    }

    $zip->close();

    foreach ($temporaryFiles as $temporaryFile) {
        @unlink($temporaryFile);
    }

    if ($added === 0) {
        @unlink($zipPath);
        return $this->sendError('NO_FILES_TO_DOWNLOAD');
    }

    return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
}

private function uniqueZipEntryName(string $fileName, array &$usedNames): string
{
    $fileName = basename($fileName);
    $extension = pathinfo($fileName, PATHINFO_EXTENSION);
    $name = pathinfo($fileName, PATHINFO_FILENAME);
    $candidate = $fileName;
    $counter = 1;

    while (isset($usedNames[$candidate])) {
        $suffix = '_' . $counter++;
        $candidate = $extension
            ? $name . $suffix . '.' . $extension
            : $name . $suffix;
    }

    $usedNames[$candidate] = true;

    return $candidate;
}

public function listTaxfilerTaxCategoryDocuments(int $user_id, int $sub_tax_category_id)
{
    if (! $this->authorizeUserScope($user_id, 'tax-documents.view')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $user = User::select('id', 'first_name', 'last_name', 'email', 'mobile')
        ->find($user_id);

    if (! $user) {
        return $this->sendError('USER_NOT_FOUND');
    }

    $subTaxCategory = SubTaxCategory::find($sub_tax_category_id);

    if (! $subTaxCategory) {
        return $this->sendError('SUBCATEGORY_NOT_FOUND');
    }

    $disk = Storage::disk('s3'); // ✅ add this

    $documents = TaxFilerDocument::with(['file', 'subTaxCategory'])
        ->where('user_id', $user->id)
        ->where('sub_tax_category_id', $subTaxCategory->id)
        ->orderBy('created_at', 'desc')
        ->get();

    $data = $documents->map(function ($doc) use ($disk) {

        $filePath = $doc->file?->getRawOriginal('file_path');

        return [
            'id' => $doc->id,
            'user_id' => $doc->user_id,
            'year' => $doc->year,
            'file_id' => $doc->file_id,
            'file_name' => $doc->file->file_name ?? null,
            'file_hash' => $doc->file->file_hash ?? null,
            'file_type' => $doc->file->file_type ?? null,
            'file_size' => $doc->file->file_size ?? null,
            'title' => $doc->file->title ?? null,

            'file_path' => $filePath && $disk->exists($filePath)
                ? $disk->temporaryUrl($filePath, now()->addMinutes(2))
                : null,

            'sub_tax_category_id' => $doc->sub_tax_category_id,
            'sub_category_name' => $doc->subTaxCategory->name ?? null,
            'status' => $doc->status,
            'comments' => $doc->comments,
            'month' => $doc->month,
            'uploaded_by' => $doc->uploaded_by,
            'created_at' => $doc->created_at,
        ];
    });

    return $this->sendResponse('RECORDS_FOUND', [
        'taxfiler' => $user,
        'sub_tax_category_id' => $subTaxCategory->id,
        'sub_category_name' => $subTaxCategory->name,
        'data' => $data
    ]);
}

public function listTaxfilerDocuments(Request $request, int $user_id)
{
    if (! $this->authorizeUserScope($user_id, 'tax-documents.view')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $rules = [
        'year' => ['nullable', 'digits:4'],
    ];

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails()) {
        return $this->sendError($validator->errors());
    }

    $user = User::select('id', 'first_name', 'last_name', 'email', 'mobile')
        ->find($user_id);

    if (! $user) {
        return $this->sendError('USER_NOT_FOUND');
    }

    $validated = $validator->validated();

    $query = UserTaxCategory::with(['taxCategory', 'documents.file', 'documents.subTaxCategory'])
        ->where('user_id', $user_id)
        ->orderByDesc('id');

    if (! empty($validated['year'])) {
        $query->where('year', $validated['year']);
    }

    $categories = $query->get()
        ->map(function ($userTaxCategory) {
            if (! $userTaxCategory->taxCategory) {
                return null;
            }

            $documents = $userTaxCategory->documents
                ->sortByDesc('created_at')
                ->values()
                ->map(function ($doc) {
                    return [
                        'id' => $doc->id,
                        'file_id' => $doc->file_id,
                        'file_name' => $doc->file->file_name ?? null,
                        'file_path' => $doc->file->file_path ?? null,
                        'file_size' => $doc->file->file_size ?? null,
                        'sub_tax_category_id' => $doc->sub_tax_category_id,
                        'sub_category_name' => $doc->subTaxCategory->name ?? null,
                        'status' => $doc->status,
                        'comments' => $doc->comments,
                        'month' => $doc->month,
                        'uploaded_by' => $doc->uploaded_by,
                        'created_at' => $doc->created_at,
                    ];
                });

            return [
                'id' => $userTaxCategory->taxCategory->id,
                'user_tax_category_id' => $userTaxCategory->id,
                'year' => $userTaxCategory->year,
                'category_name' => $userTaxCategory->taxCategory->name,
                'category_code' => $userTaxCategory->taxCategory->code,
                'document_count' => $documents->count(),
                'documents' => $documents,
            ];
        })
        ->filter()
        ->values();

    return $this->sendResponse('RECORDS_FOUND', [
        'taxfiler' => $user,
        'data' => $categories,
    ]);
}

public function listTaxfilerSubcategoryDocuments(Request $request, int $user_id, int $sub_tax_category_id)
{
    if (! $this->authorizeUserScope($user_id, 'tax-documents.view')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $filters = Config::get('users.filters', [
        'results_per_page' => 15,
        'page' => 1,
        'search' => '',
        'offset' => 0,
    ]);

    $rules = [
        'year' => ['nullable', 'digits:4'],
        'search' => ['nullable', 'string'],
        'results_per_page' => ['nullable', 'numeric', 'gt:0'],
        'page' => ['nullable', 'numeric', 'gt:0'],
    ];

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails()) {
        return $this->sendError($validator->errors(), 422);
    }

    $validated = $validator->validated();
    $search = $validated['search'] ?? $filters['search'];
    $results_per_page = (int) ($validated['results_per_page'] ?? $filters['results_per_page']);
    $page = (int) ($validated['page'] ?? $filters['page']);
    $offset = ($page - 1) * $results_per_page;

    $user = User::select('id', 'first_name', 'last_name', 'email', 'mobile')
        ->find($user_id);

    if (! $user) {
        return $this->sendError('USER_NOT_FOUND');
    }

    $subTaxCategory = SubTaxCategory::find($sub_tax_category_id);

    if (! $subTaxCategory) {
        return $this->sendError('SUBCATEGORY_NOT_FOUND');
    }

    $query = TaxFilerDocument::with(['file', 'subTaxCategory'])
        ->where('user_id', $user_id)
        ->where('sub_tax_category_id', $subTaxCategory->id)
        ->when(! empty($validated['year']), function ($query) use ($validated) {
            $query->where('year', $validated['year']);
        })
        ->when($search !== null && $search !== '', function ($query) use ($search) {
            $query->whereHas('file', function ($fileQuery) use ($search) {
                $fileQuery->where('file_name', 'like', "%{$search}%")
                    ->orWhere('file_type', 'like', "%{$search}%")
                    ->orWhere('file_size', 'like', "%{$search}%");
            });
        })
        ->orderByDesc('created_at');

    $total_results = $query->count();
    $max = (int) ceil($total_results / $results_per_page);

    $documents = $query
        ->limit($results_per_page)
        ->offset($offset)
        ->get()
        ->map(function ($doc) {
            return [
                'id' => $doc->id,
                'user_id' => $doc->user_id,
                'year' => $doc->year,
                'sub_tax_category_id' => $doc->sub_tax_category_id,
                'sub_category_name' => $doc->subTaxCategory->name ?? null,
                'file_id' => $doc->file_id,
                'document_name' => $doc->file->file_name ?? null,
                'file_hash' => $doc->file->file_hash ?? null,
                'document_type' => $doc->file->file_type ?? null,
                'document_size' => $doc->file->file_size ?? null,
                'file_path' => $doc->file->file_path ?? null,
                'status' => $doc->status,
                'comments' => $doc->comments,
                'month' => $doc->month,
                'uploaded_by' => $doc->uploaded_by,
                'created_at' => $doc->created_at,
            ];
        })
        ->values();

    return $this->sendResponse('RECORDS_FOUND', [
        'taxfiler' => $user,
        'sub_tax_category_id' => $subTaxCategory->id,
        'sub_category_name' => $subTaxCategory->name,
        'meta' => [
            'first_page' => 1,
            'last_page' => max($max, 1),
            'current_page' => $page,
            'num_results' => $documents->count(),
            'total_results' => $total_results,
        ],
        'data' => $documents,
    ]);
}

    /**
     * Delete tax filer documents
     */
    public function delete(Request $request, int $sub_tax_category_id)
    {
        return $this->deleteDocuments($request, auth()->id(), $sub_tax_category_id);
    }

    public function deleteTaxfilerDocument(Request $request, int $user_id, int $sub_tax_category_id)
    {
        if (! $this->authorizeUserScope($user_id, 'tax-documents.upload')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $taxfiler = User::find($user_id);
        if (! $taxfiler) {
            return $this->sendError('USER_NOT_FOUND');
        }

        return $this->deleteDocuments($request, $taxfiler->id, $sub_tax_category_id);
    }

    private function deleteDocuments(Request $request, int $user_id, int $sub_tax_category_id)
    {
        $subTaxCategory = SubTaxCategory::find($sub_tax_category_id);
        if (! $subTaxCategory) {
            return $this->sendError('SUBCATEGORY_NOT_FOUND');
        }

        $rules = [
            'file_hash' => ['nullable', 'list'],
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();
        $files = $validated['file_hash'] ?? [];
        $deleted = 0;

        if (empty($files)) {
            return $this->sendError('NO_FILES_PROVIDED');
        }

        foreach ($files as $file_hash) {
            $file = FileModel::where([
                'file_hash' => $file_hash,
                'group' => 'tax_filer',
            ])->first();

            if (! $file) {
                continue;
            }

            $document = TaxFilerDocument::where([
                'user_id' => $user_id,
                'sub_tax_category_id' => $subTaxCategory->id,
                'file_id' => $file->id,
            ])->where('status', '<>', 'approved')->first();

            if (! $document) {
                continue;
            }

            Storage::disk('s3')->delete($file->file_path);
            $file->delete();
            $document->delete();
            $deleted++;
        }

        if ($deleted > 0) {
            return $this->sendResponse('FILES_DELETED', ['deleted_count' => $deleted]);
        }

        return $this->sendError('NO_FILES_DELETED');
    }

    // Edit tax filer document title and metadata
    public function edit(Request $request, int $sub_tax_category_id)
    {
        $subTaxCategory = SubTaxCategory::find($sub_tax_category_id);
        if (! $subTaxCategory) {
            return $this->sendError('SUBCATEGORY_NOT_FOUND');
        }

        $rules = [
            'file_hash' => ['required', 'string'],
            'title' => ['nullable', 'string', 'max:100'],
            'alt' => ['nullable', 'string', 'max:100'],
            'comment' => ['nullable', 'string'],
            'comments' => ['nullable', 'string'],
            'year' => ['nullable', 'digits:4'],
            'month' => ['nullable', 'between:1,12'],
            'status' => ['nullable', Rule::in(['approved', 'reupload', 'pending'])],
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $file = FileModel::where([
            'file_hash' => $validated['file_hash'],
            'group' => 'tax_filer',
        ])->first();

        if (! $file) {
            return $this->sendError('FILE_NOT_FOUND');
        }

        $document = TaxFilerDocument::where([
            'user_id' => auth()->id(),
            'sub_tax_category_id' => $subTaxCategory->id,
            'file_id' => $file->id,
        ])->first();

        if (! $document) {
            return $this->sendError('DOCUMENT_NOT_FOUND');
        }

        if (array_key_exists('title', $validated)) {
            $file->title = $validated['title'];
        }

        if (array_key_exists('alt', $validated)) {
            $file->file_alt = $validated['alt'];
        }

        $file->updated_by = auth()->id();
        $file->save();

        $documentData = [];

        if (array_key_exists('comment', $validated)) {
            $documentData['comments'] = $validated['comment'];
        }

        if (array_key_exists('comments', $validated)) {
            $documentData['comments'] = $validated['comments'];
        }

        foreach (['year', 'month', 'status'] as $field) {
            if (array_key_exists($field, $validated)) {
                $documentData[$field] = $validated[$field];
            }
        }

        if (! empty($documentData)) {
            $document->update($documentData);
        }

        return $this->sendResponse('DOCUMENT_UPDATED', [
            'document' => [
                'id' => $document->id,
                'user_id' => $document->user_id,
                'year' => $document->year,
                'month' => $document->month,
                'sub_tax_category_id' => $document->sub_tax_category_id,
                'file_id' => $document->file_id,
                'file_hash' => $file->file_hash,
                'file_name' => $file->file_name,
                'title' => $file->title,
                'file_alt' => $file->file_alt,
                'status' => $document->status,
                'comments' => $document->comments,
                'updated_at' => $document->updated_at,
            ],
        ]);
    }

    // Add comments to tax filer document
    public function comment(Request $request, int $sub_tax_category_id)
    {
        // Approve-tier, staff-only — matches Clients\Documents::comment(): a
        // taxfiler never comments/approves their own submission, so this is a
        // flat permission check with no self-fallback.
        if (! auth()->user()->can('tax-documents.approve')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $subTaxCategory = SubTaxCategory::find($sub_tax_category_id);
        if (! $subTaxCategory) {
            return $this->sendError('SUBCATEGORY_NOT_FOUND');
        }

        $rules = [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'file_hash' => ['required', 'string'],
            'comment' => ['required', 'string'],
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $file = FileModel::where([
            'file_hash' => $validated['file_hash'],
            'group' => 'tax_filer',
        ])->first();

        if (! $file) {
            return $this->sendError('FILE_NOT_FOUND');
        }

        $document = TaxFilerDocument::where([
            'user_id' => $validated['user_id'],
            'sub_tax_category_id' => $subTaxCategory->id,
            'file_id' => $file->id,
        ])->first();

        if (! $document) {
            return $this->sendError('DOCUMENT_NOT_FOUND');
        }

        $document->update([
            'comments' => $validated['comment'],
        ]);

        return $this->sendResponse('COMMENT_ADDED', []);
    }

    // Add status to tax filer document
    public function status(Request $request, int $sub_tax_category_id)
    {
        // Approve-tier, staff-only — see comment() above.
        if (! auth()->user()->can('tax-documents.approve')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $subTaxCategory = SubTaxCategory::find($sub_tax_category_id);
        if (! $subTaxCategory) {
            return $this->sendError('SUBCATEGORY_NOT_FOUND');
        }

        $rules = [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'file_hash' => ['required', 'string'],
            'status' => ['required', Rule::in(['approved', 'reupload', 'pending'])],
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $file = FileModel::where([
            'file_hash' => $validated['file_hash'],
            'group' => 'tax_filer',
        ])->first();

        if (! $file) {
            return $this->sendError('FILE_NOT_FOUND');
        }

        $document = TaxFilerDocument::where([
            'user_id' => $validated['user_id'],
            'sub_tax_category_id' => $subTaxCategory->id,
            'file_id' => $file->id,
        ])->first();

        if (! $document) {
            return $this->sendError('DOCUMENT_NOT_FOUND');
        }

        $document->update([
            'status' => $validated['status'],
        ]);

        return $this->sendResponse('STATUS_UPDATED', []);
    }


public function taxfilerDownloadAllDocumentsZip(Request $request)
{
    $validator = Validator::make($request->all(), [
        'year' => ['nullable', 'digits:4'],
    ]);

    if ($validator->fails()) {
        return $this->sendError($validator->errors());
    }

    $year = $validator->validated()['year'] ?? null;
    $userId = auth()->id();
    $disk = Storage::disk('s3');

    $documents = TaxFilerDocument::with(['file', 'subTaxCategory'])
        ->where('user_id', $userId)
        ->when($year, fn ($q) => $q->where('year', $year))
        ->orderByDesc('created_at')
        ->get()
        ->filter(fn ($document) => $document->file !== null);

    if ($documents->isEmpty()) {
        return $this->sendError('DOCUMENTS_NOT_FOUND');
    }

    $zipDirectory = storage_path('app/temp');
    if (! is_dir($zipDirectory)) {
        mkdir($zipDirectory, 0755, true);
    }

    $suffix = $year ? '_' . $year : '';
    $zipName = 'taxfiler_' . $userId . '_all_documents' . $suffix . '_' . now()->format('YmdHis') . '.zip';
    $zipPath = $zipDirectory . '/' . $zipName;

    $zip = new \ZipArchive();
    if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
        return $this->sendError('ZIP_CREATION_FAILED');
    }

    $temporaryFiles = [];
    $added = 0;
    $usedNamesPerFolder = [];

    foreach ($documents as $document) {
        $filePath = $document->file->getRawOriginal('file_path');

        if (! $filePath || ! $disk->exists($filePath)) {
            continue;
        }

        $stream = $disk->readStream($filePath);
        if (! $stream) {
            continue;
        }

        $temporaryPath = tempnam($zipDirectory, 'zip_doc_');
        $temporaryFile = fopen($temporaryPath, 'w');

        if ($temporaryFile === false) {
            if (is_resource($stream)) fclose($stream);
            continue;
        }

        stream_copy_to_stream($stream, $temporaryFile);
        if (is_resource($stream)) fclose($stream);
        fclose($temporaryFile);

        $temporaryFiles[] = $temporaryPath;

        $subCategoryName = $document->subTaxCategory->name ?? 'Uncategorized';
        $folderName = preg_replace('/[^a-zA-Z0-9_\- ]/', '', $subCategoryName);

        if (! isset($usedNamesPerFolder[$folderName])) {
            $usedNamesPerFolder[$folderName] = [];
        }

        $fileName = $document->file->file_name ?: basename($filePath);
        $zipEntryName = $folderName . '/' . $this->uniqueZipEntryName($fileName, $usedNamesPerFolder[$folderName]);

        if ($zip->addFile($temporaryPath, $zipEntryName)) {
            $added++;
        }
    }

    $zip->close();

    foreach ($temporaryFiles as $temporaryFile) {
        @unlink($temporaryFile);
    }

    if ($added === 0) {
        @unlink($zipPath);
        return $this->sendError('NO_FILES_TO_DOWNLOAD');
    }

    return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
}

public function accountantDownloadSubcategoryDocumentsZip(
    Request $request,
    int $userId,
    int $sub_tax_category_id,
    ?int $year = null
) {
    // ✅ Validate ONLY route params manually (optional)
    if ($year && strlen($year) !== 4) {
        return $this->sendError('INVALID_YEAR');
    }

    // Check subcategory
    $subTaxCategory = SubTaxCategory::find($sub_tax_category_id);

    if (! $subTaxCategory) {
        return $this->sendError('SUBCATEGORY_NOT_FOUND');
    }

    if (! $this->authorizeUserScope($userId, 'tax-documents.view')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $disk = Storage::disk('s3');

    $documents = TaxFilerDocument::with('file')
        ->where('user_id', $userId) // ✅ from route
        ->where('sub_tax_category_id', $subTaxCategory->id)
        ->when($year, function ($query) use ($year) {
            $query->where('year', $year);
        })
        ->orderByDesc('created_at')
        ->get()
        ->filter(fn ($document) => $document->file !== null);

    if ($documents->isEmpty()) {
        return $this->sendError('DOCUMENTS_NOT_FOUND');
    }

    $zipDirectory = storage_path('app/temp');
    if (! is_dir($zipDirectory)) {
        mkdir($zipDirectory, 0755, true);
    }

    $zipName = 'accountant_taxcategory_' . $subTaxCategory->id . '_user_' . $userId . '_documents_' . now()->format('YmdHis') . '.zip';
    $zipPath = $zipDirectory . '/' . $zipName;

    $zip = new \ZipArchive();

    if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
        return $this->sendError('ZIP_CREATION_FAILED');
    }

    $temporaryFiles = [];
    $added = 0;
    $usedNames = [];

    foreach ($documents as $document) {
        $filePath = $document->file->getRawOriginal('file_path');

        if (! $filePath || ! $disk->exists($filePath)) {
            continue;
        }

        $stream = $disk->readStream($filePath);

        if (! $stream) {
            continue;
        }

        $temporaryPath = tempnam($zipDirectory, 'zip_doc_');
        $temporaryFile = fopen($temporaryPath, 'w');

        if ($temporaryFile === false) {
            if (is_resource($stream)) fclose($stream);
            continue;
        }

        stream_copy_to_stream($stream, $temporaryFile);

        if (is_resource($stream)) fclose($stream);
        fclose($temporaryFile);

        $temporaryFiles[] = $temporaryPath;

        $zipEntryName = $document->file->file_name ?: basename($filePath);
        $zipEntryName = $this->uniqueZipEntryName($zipEntryName, $usedNames);

        if ($zip->addFile($temporaryPath, $zipEntryName)) {
            $added++;
        }
    }

    $zip->close();

    foreach ($temporaryFiles as $temporaryFile) {
        @unlink($temporaryFile);
    }

    if ($added === 0) {
        @unlink($zipPath);
        return $this->sendError('NO_FILES_TO_DOWNLOAD');
    }

    return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
}

public function accountantDownloadAllSubcategoriesZip(
    Request $request,
    int $userId,
    int $year
) {
    if (strlen((string) $year) !== 4) {
        return $this->sendError('INVALID_YEAR');
    }

    if (! $this->authorizeUserScope($userId, 'tax-documents.view')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $disk = Storage::disk('s3');

    $documents = TaxFilerDocument::with(['file', 'subTaxCategory'])
        ->where('user_id', $userId)
        ->where('year', $year)
        ->orderByDesc('created_at')
        ->get()
        ->filter(fn ($document) => $document->file !== null);

    if ($documents->isEmpty()) {
        return $this->sendError('DOCUMENTS_NOT_FOUND');
    }

    $zipDirectory = storage_path('app/temp');
    if (! is_dir($zipDirectory)) {
        mkdir($zipDirectory, 0755, true);
    }

    $zipName = 'taxfiler_' . $userId . '_all_subcategories_' . $year . '_' . now()->format('YmdHis') . '.zip';
    $zipPath = $zipDirectory . '/' . $zipName;

    $zip = new \ZipArchive();

    if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
        return $this->sendError('ZIP_CREATION_FAILED');
    }

    $temporaryFiles = [];
    $added = 0;
    $usedNamesPerFolder = [];

    foreach ($documents as $document) {
        $filePath = $document->file->getRawOriginal('file_path');

        if (! $filePath || ! $disk->exists($filePath)) {
            continue;
        }

        $stream = $disk->readStream($filePath);

        if (! $stream) {
            continue;
        }

        $temporaryPath = tempnam($zipDirectory, 'zip_doc_');
        $temporaryFile = fopen($temporaryPath, 'w');

        if ($temporaryFile === false) {
            if (is_resource($stream)) fclose($stream);
            continue;
        }

        stream_copy_to_stream($stream, $temporaryFile);

        if (is_resource($stream)) fclose($stream);
        fclose($temporaryFile);

        $temporaryFiles[] = $temporaryPath;

        $subCategoryName = $document->subTaxCategory->name ?? 'Uncategorized';
        $folderName = preg_replace('/[^a-zA-Z0-9_\- ]/', '', $subCategoryName);

        if (! isset($usedNamesPerFolder[$folderName])) {
            $usedNamesPerFolder[$folderName] = [];
        }

        $fileName = $document->file->file_name ?: basename($filePath);
        $zipEntryName = $folderName . '/' . $this->uniqueZipEntryName($fileName, $usedNamesPerFolder[$folderName]);

        if ($zip->addFile($temporaryPath, $zipEntryName)) {
            $added++;
        }
    }

    $zip->close();

    foreach ($temporaryFiles as $temporaryFile) {
        @unlink($temporaryFile);
    }

    if ($added === 0) {
        @unlink($zipPath);
        return $this->sendError('NO_FILES_TO_DOWNLOAD');
    }

    return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
}

public function accountantDownloadCategoryDocumentsZip(
    Request $request,
    int $userId,
    int $tax_category_id
) {
    if (! $this->authorizeUserScope($userId, 'tax-documents.view')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $validator = Validator::make($request->all(), [
        'year' => ['nullable', 'digits:4'],
    ]);

    if ($validator->fails()) {
        return $this->sendError($validator->errors());
    }

    $year = $validator->validated()['year'] ?? null;

    $taxCategory = TaxCategory::find($tax_category_id);

    if (! $taxCategory) {
        return $this->sendError('CATEGORY_NOT_FOUND');
    }

    $subCategoryIds = $taxCategory->subTaxCategories()->pluck('sub_tax_categories.id');

    if ($subCategoryIds->isEmpty()) {
        return $this->sendError('NO_SUBCATEGORIES_FOUND');
    }

    $disk = Storage::disk('s3');

    $documents = TaxFilerDocument::with(['file', 'subTaxCategory'])
        ->where('user_id', $userId)
        ->whereIn('sub_tax_category_id', $subCategoryIds)
        ->when($year, fn ($q) => $q->where('year', $year))
        ->orderByDesc('created_at')
        ->get()
        ->filter(fn ($document) => $document->file !== null);

    if ($documents->isEmpty()) {
        return $this->sendError('DOCUMENTS_NOT_FOUND');
    }

    $zipDirectory = storage_path('app/temp');
    if (! is_dir($zipDirectory)) {
        mkdir($zipDirectory, 0755, true);
    }

    $zipName = 'category_' . $taxCategory->id . '_user_' . $userId . '_' . now()->format('YmdHis') . '.zip';
    $zipPath = $zipDirectory . '/' . $zipName;

    $zip = new \ZipArchive();

    if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
        return $this->sendError('ZIP_CREATION_FAILED');
    }

    $temporaryFiles = [];
    $added = 0;
    $usedNamesPerFolder = [];

    foreach ($documents as $document) {
        $filePath = $document->file->getRawOriginal('file_path');

        if (! $filePath || ! $disk->exists($filePath)) {
            continue;
        }

        $stream = $disk->readStream($filePath);

        if (! $stream) {
            continue;
        }

        $temporaryPath = tempnam($zipDirectory, 'zip_doc_');
        $temporaryFile = fopen($temporaryPath, 'w');

        if ($temporaryFile === false) {
            if (is_resource($stream)) fclose($stream);
            continue;
        }

        stream_copy_to_stream($stream, $temporaryFile);

        if (is_resource($stream)) fclose($stream);
        fclose($temporaryFile);

        $temporaryFiles[] = $temporaryPath;

        $subCategoryName = $document->subTaxCategory->name ?? 'Uncategorized';
        $folderName = preg_replace('/[^a-zA-Z0-9_\- ]/', '', $subCategoryName);

        if (! isset($usedNamesPerFolder[$folderName])) {
            $usedNamesPerFolder[$folderName] = [];
        }

        $fileName = $document->file->file_name ?: basename($filePath);
        $zipEntryName = $folderName . '/' . $this->uniqueZipEntryName($fileName, $usedNamesPerFolder[$folderName]);

        if ($zip->addFile($temporaryPath, $zipEntryName)) {
            $added++;
        }
    }

    $zip->close();

    foreach ($temporaryFiles as $temporaryFile) {
        @unlink($temporaryFile);
    }

    if ($added === 0) {
        @unlink($zipPath);
        return $this->sendError('NO_FILES_TO_DOWNLOAD');
    }

    return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
}

public function accountantDownloadSingleDocument(
    Request $request,
    int $userId,
    int $sub_tax_category_id,
    int $file_id
) {
    $subTaxCategory = SubTaxCategory::find($sub_tax_category_id);

    if (! $subTaxCategory) {
        return $this->sendError('SUBCATEGORY_NOT_FOUND');
    }

    if (! $this->authorizeUserScope($userId, 'tax-documents.view')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $disk = Storage::disk('s3');

    $document = TaxFilerDocument::with('file')
        ->where('user_id', $userId)
        ->where('sub_tax_category_id', $subTaxCategory->id)
        ->where('file_id', $file_id)
        ->first();

    if (! $document || ! $document->file) {
        return $this->sendError('DOCUMENT_NOT_FOUND');
    }

    $filePath = $document->file->getRawOriginal('file_path');

    if (! $filePath || ! $disk->exists($filePath)) {
        return $this->sendError('FILE_NOT_FOUND');
    }

    $stream = $disk->readStream($filePath);

    if (! $stream) {
        return $this->sendError('FILE_STREAM_FAILED');
    }

    $tempDirectory = storage_path('app/temp');
    if (! is_dir($tempDirectory)) {
        mkdir($tempDirectory, 0755, true);
    }

    $temporaryPath = tempnam($tempDirectory, 'dl_doc_');
    $temporaryFile = fopen($temporaryPath, 'w');

    if ($temporaryFile === false) {
        if (is_resource($stream)) fclose($stream);
        return $this->sendError('FILE_TEMP_FAILED');
    }

    stream_copy_to_stream($stream, $temporaryFile);

    if (is_resource($stream)) fclose($stream);
    fclose($temporaryFile);

    $fileName = $document->file->file_name ?: basename($filePath);
    $mimeType = $document->file->file_type ?: 'application/octet-stream';

    Notification::record(
        $userId,
        'Document downloaded',
        "Your document \"{$fileName}\" under \"{$subTaxCategory->name}\" was downloaded.",
        'document_downloaded',
        auth()->id()
    );

    return response()->download($temporaryPath, $fileName, [
        'Content-Type' => $mimeType,
    ])->deleteFileAfterSend(true);
}
}
