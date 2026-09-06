<?php

namespace App\Modules\Clients\Controllers;

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
use App\Modules\Clients\Models\Checklist;
use App\Modules\Clients\Models\Document;
use App\Modules\Clients\Models\Firm;
use App\Modules\Individual\Models\TaxFilerDocument;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Notifications\Models\Notification;

class Documents extends BaseController {

    /**
     * Upload attachments
     */
    public function upload (Request $request, string $code='') {

        $checklist = Checklist::where (['code' => $code])->first();
        if (! $checklist) {
            return $this->sendError ('CHECKLIST_NOT_FOUND');
        }

        $firm = Firm::find ($checklist->firm_id);
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'documents.approve', 'manage_checklist', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

		$max = Config::get('files.max_upload_size');
		$allowed = Config::get('files.allowed_types');
        $allowed = collect($allowed)->flatten()->toArray();
        $rules = [
            'document' => [ 'required', File::types($allowed)->max($max) ],
			'alt' => ["nullable", 'string', 'max:100'],
			'title' => ["nullable", 'string', 'max:100'],
            'year' => ["nullable", 'digits:4'],
            'month' => ["nullable", 'between:1,12'],
		];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();
            $group = 'document';
            $path =  'documents/' . $firm->guid . '/' . $checklist->code;

            if ($request->file('document')->isValid()) {
            // Store the new file
                $files = new Files();
                $uploadedFile = $request->file('document');
                $extension = $uploadedFile->extension();
                $name = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
                $file_name = Str::slug($name) . '.' . $extension;
                $data = $files->store ($request, $uploadedFile, $group, $file_name, $path);

                // Save document record
                Document::create ([
                    'checklist_id' => $checklist->id,
                    'file_id' => $data['file_id'],
                    'uploaded_by' => auth()->id(),
                    'status' => 'pending',
                    'comments' => '',
                    'year' => $validated['year'] ?? date('Y'),
                    'month' => $validated['month'] ?? date('n'),
                ]);

                $this->notifyDocumentUploaded($checklist, $firm);

                return $this->sendResponse ('FILES_UPLOADED', $data);
            }
        }
    }

    /**
     * Bulk upload attachments — Admin/Accountant only.
     *
     * Deliberately a separate method rather than teaching upload() to accept an
     * array: this path has different auth (staff only, no Client/Employee),
     * a different starting status ('approved', not 'pending') and freezes that
     * status, so folding the two together would mean branching on role inside
     * the shared upload path.
     *
     * Every document created here is 'approved' and status_locked — an
     * Admin/Accountant putting the file there IS the review, so there is
     * nothing for status()/reupload() to change afterward (both refuse a
     * locked document with DOCUMENT_STATUS_LOCKED).
     *
     * Per-file processing, not all-or-nothing: a file that fails to store is
     * reported in `failed` and the rest still land, following the per-item
     * convention delete() already uses. Only an empty `uploaded` set is an
     * error response.
     */
    public function bulkUpload (Request $request, string $code='') {

        $checklist = Checklist::where (['code' => $code])->first();
        if (! $checklist) {
            return $this->sendError ('CHECKLIST_NOT_FOUND');
        }

        $firm = Firm::find ($checklist->firm_id);
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }

        // Two gates, both required. The role check is this endpoint's own rule
        // (Admin/Accountant only — Staff and a firm's own Client/Employee are
        // out, even though authorizeFirmScope() would let a Client upload to
        // their own firm via the single-file upload()). The firm-scope check
        // then keeps a non-Admin Accountant to firms they're actually assigned
        // to, same as status()/comment().
        $user = auth()->user();
        if (! $user || ! ($user->hasRole('Admin') || $user->hasRole('Accountant'))) {
            return $this->sendError ('UNAUTHORIZED', 403);
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'documents.approve', 'manage_checklist')) {
            return $this->sendError ('UNAUTHORIZED', 403);
        }

        $max = Config::get('files.max_upload_size');
        $allowed = Config::get('files.allowed_types');
        $allowed = collect($allowed)->flatten()->toArray();
        $rules = [
            'documents' => ['required', 'array', 'min:1', 'max:20'],
            'documents.*' => ['required', File::types($allowed)->max($max)],
            'year' => ['nullable', 'digits:4'],
            'month' => ['nullable', 'between:1,12'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        }

        $validated = $validator->validated();
        $group = 'document';
        $path =  'documents/' . $firm->guid . '/' . $checklist->code;
        // year/month apply to the whole batch — these describe the period the
        // documents belong to, not the individual file.
        $year = $validated['year'] ?? date('Y');
        $month = $validated['month'] ?? date('n');

        $files = new Files();
        $uploaded = [];
        $failed = [];

        foreach ($request->file('documents') as $index => $uploadedFile) {
            if (! $uploadedFile->isValid()) {
                $failed[] = [
                    'index' => $index,
                    'file_name' => $uploadedFile->getClientOriginalName(),
                    'reason' => 'UPLOAD_INVALID',
                ];
                continue;
            }

            $extension = $uploadedFile->extension();
            $name = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
            $file_name = Str::slug($name) . '.' . $extension;
            $data = $files->store ($request, $uploadedFile, $group, $file_name, $path);

            Document::create ([
                'checklist_id' => $checklist->id,
                'file_id' => $data['file_id'],
                'uploaded_by' => auth()->id(),
                'status' => 'approved',
                'status_locked' => true,
                'comments' => '',
                'year' => $year,
                'month' => $month,
            ]);

            $uploaded[] = $data;
        }

        if (empty($uploaded)) {
            return $this->sendError ('FILES_NOT_UPLOADED');
        }

        ActivityLog::record('documents', 'bulk uploaded ' . count($uploaded) . " document(s) for {$checklist->name}", null, auth()->id());

        return $this->sendResponse ('FILES_UPLOADED', [
            'uploaded_count' => count($uploaded),
            'failed_count' => count($failed),
            'status' => 'approved',
            'files' => $uploaded,
            'failed' => $failed,
        ]);
    }

    /**
     * Notify the internal team (every Admin, every Accountant — neither scoped
     * to a specific firm today, same precedent as Firms::notifyFirmEdited())
     * that a client uploaded a document needing review.
     */
    private function notifyDocumentUploaded(Checklist $checklist, Firm $firm): void
    {
        $recipients = User::role('Admin')->get()
            ->merge(User::role('Accountant')->get())
            ->unique('id');

        foreach ($recipients as $recipient) {
            Notification::record(
                $recipient->id,
                'Document uploaded',
                "A new document was uploaded for \"{$checklist->name}\" under {$firm->firm_name}.",
                'document_uploaded',
                auth()->id()
            );
        }
    }

    /**
     * Get document
     *
     * @param Request $request
     *
     **/
    public function get (Request $request, string $code='') {

        $checklist = Checklist::where (['code' => $code])->with('files')->first();
        if (! $checklist) {
            return $this->sendError ('CHECKLIST_NOT_FOUND');
        }

        $firm = Firm::find ($checklist->firm_id);
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        // Read action (fetch a document/checklist detail) — reuse the same
        // read-tier org-permission code as Firms::getAll()/Checklists::getAll()
        // so Senior/Dataloader-assigned accountants (who lack manage_checklist)
        // aren't 403'd on something the Client can already see.
        if (! $this->authorizeFirmScope($firm->id, 'documents.approve', 'access_business_account')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        // Validate the request...
        $rules = [
            'file_hash' => ['nullable', 'string'],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            $validated = $validator->validated();
            $file_hash = $validated['file_hash'] ?? '';
            if ($checklist->category == NULL) {
                // This may have children
                $children = Checklist::where (['category' => $checklist->id])->with('files')->get();
                // Check if file is newly uploaded (not viewed by user yet)
                if (! empty ($children)) {
                    foreach ($children as $child) {
                        if (isset($child->files)) {
                            $documents = $child->files;
                            $num_isNew = 0;
                            if ($documents) {
                                foreach ($documents as $key => $document) {
                                    $is_new = app('App\Modules\Files\Controllers\Files')->isNew($document->id, auth()->id());
                                    $document->is_new = $is_new;
                                    if ($is_new) {
                                        $num_isNew++;
                                    }
                                }
                                $child->files = $documents;
                                $child->num_isNew = $num_isNew;
                            }
                        }
                    }
                }
                $checklist->children = $children;                
            } else {
                $checklist->children = [];
            }

            return $this->sendResponse ('FILE_FOUND', $checklist);
        }
    }

    /**
     * Remove profile image
     */
    public function delete (Request $request, string $code='') {

        $checklist = Checklist::where (['code' => $code])->first();
        if (! $checklist) {
            return $this->sendError ('CHECKLIST_NOT_FOUND');
        }

        $firm = Firm::find ($checklist->firm_id);
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'documents.approve', 'manage_checklist', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        // Validate the request...
        $rules = [
            'file_hash' => ['nullable', 'list'],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            $validated = $validator->validated();
            $files = $validated['file_hash'] ?? [];
            $deleted = 0;
            if (! empty ($files)) {
                foreach ($files as $file_hash) {

                    $file = FileModel::where (['file_hash'=>$file_hash, 'group'=>'document'])->first();
                    if ($file) {
                        $document = Document::where (['checklist_id'=>$checklist->id, 'file_id'=>$file->id])->where('status', '<>', 'approved')->first();
                        if ($document) {
                            $file_id = $file->id;
                            $file_name = $file->file_name;

                            // Log/notify before deleting the file row — activity_logs.document_id
                            // has a FK to files.id with no SoftDeletes on File, so logging after
                            // the hard delete violates the constraint (pre-existing bug, fixed here).
                            ActivityLog::record('documents', "Delete the document", $file_id, auth()->id());
                            $this->notifyDocumentDeleted($firm, $file_name);

                            // Delete physical file
                            Storage::disk('s3')->delete($file->file_path);
                            // Delete file record
                            $file->delete();
                            $document->delete();
                            $deleted++;
                        }
                    }
                }
                if ($deleted > 0) {
                    return $this->sendResponse ('FILES_DELETED', ['deleted_count' => $deleted]);
                } else {
                    return $this->sendError ('NO_FILES_DELETED');
                }
            }

            return $this->sendError ('NO_FILES_PROVIDED');
        }
    }

    /**
     * Notify the firm's Client user(s) when a document is deleted.
     * Called once per deleted file (delete() may remove several in one request).
     */
    private function notifyDocumentDeleted(Firm $firm, string $fileName): void
    {
        $clients = User::where('firm_id', $firm->id)->role('Client')->get();

        foreach ($clients as $client) {
            Notification::record(
                $client->id,
                'Document deleted',
                "The document \"{$fileName}\" was deleted.",
                'document_deleted',
                auth()->id()
            );
        }
    }

    // Add comments to document
    public function comment (Request $request, int $id) {

        $checklist = Checklist::find($id);
        if (! $checklist) {
            return $this->sendError ('CHECKLIST_NOT_FOUND');
        }

        $firm = Firm::find ($checklist->firm_id);
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'documents.approve', 'manage_checklist')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        // Validate the request...
        $rules = [
            'file_hash' => ['required', 'string'],
            'comment' => ['required', 'string'],
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            $validated = $validator->validated();
            $file_hash = $validated['file_hash'];
            $comment = $validated['comment'];

            $file = FileModel::where (['file_hash'=>$file_hash])->first();
            if (!$file) {
                return $this->sendError ('FILE_NOT_FOUND');
            }
            $document = Document::where (['checklist_id'=>$checklist->id, 'file_id'=>$file->id])->update([
                'comments' => $comment,
            ]);

            ActivityLog::record('firms', "added remark for {$file->file_name} document", $file->id, auth()->id());

            $this->notifyDocumentCommented($firm, $file);

            return $this->sendResponse ('COMMENT_ADDED', []);
        }
    }

    /**
     * Notify the firm's Client user(s) when a remark/comment is added to one of their documents.
     */
    private function notifyDocumentCommented(Firm $firm, FileModel $file): void
    {
        $clients = User::where('firm_id', $firm->id)->role('Client')->get();

        foreach ($clients as $client) {
            Notification::record(
                $client->id,
                'Document remark added',
                "A remark was added to \"{$file->file_name}\".",
                'document_commented',
                auth()->id()
            );
        }
    }

    // Add status to document
    public function status (Request $request, int $id) {

        $checklist = Checklist::where (['id' => $id])->first();
        if (! $checklist) {
            return $this->sendError ('CHECKLIST_NOT_FOUND');
        }

        $firm = Firm::find ($checklist->firm_id);
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'documents.approve', 'manage_checklist')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        // Validate the request...
        $rules = [
            'file_hash' => ['required', 'string'],
            'status' => ['required', Rule::in(['approved', 'reupload', 'pending'])],
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            $validated = $validator->validated();
            $file_hash = $validated['file_hash'];
            $status = $validated['status'];

            $file = FileModel::where (['file_hash'=>$file_hash])->first();
            if (!$file) {
                return $this->sendError ('FILE_NOT_FOUND');
            }

            // Documents uploaded in bulk by an Admin/Accountant are already
            // final ('approved') and their status is frozen — see bulkUpload().
            $locked = Document::where (['checklist_id'=>$checklist->id, 'file_id'=>$file->id])
                ->where('status_locked', true)
                ->exists();
            if ($locked) {
                return $this->sendError ('DOCUMENT_STATUS_LOCKED');
            }

            $document = Document::where (['checklist_id'=>$checklist->id, 'file_id'=>$file->id])->update([
                'status' => $status,
            ]);

            return $this->sendResponse ('STATUS_UPDATED', []);
        }
    }


    /**
     * =======================================
     * CLIENT AGREEMENTS DOCUMENTS METHODS
     * =======================================
     */
    /**
     * Upload attachments
     */
    public function upload_agreement (Request $request, string $guid='') {

        $firm = Firm::where ('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'documents.approve', 'manage_checklist', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

		$max = Config::get('files.max_upload_size');
		$allowed = Config::get('files.allowed_types');
        $allowed = collect($allowed)->flatten()->toArray();
        $rules = [
            'document' => [ 'required', File::types($allowed)->max($max) ],
			'alt' => ["nullable", 'string', 'max:100'],
			'title' => ["nullable", 'string', 'max:100'],
		];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();
            $group = 'agreement';
            $path =  'documents/' . $firm->guid . '/agreements';

            if ($request->hasFile('document')) {

                // Store the new file
                $files = new Files();
                $uploadedFile = $request->file('document');
                $extension = $uploadedFile->extension();
                $name = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
                $file_name = Str::slug($name) . '.' . $extension;
                $data = $files->store ($request, $uploadedFile, $group, $file_name, $path);
                
                // Save agreement record
                DB::table('firm_agreements')->insert([
                    'firm_id' => $firm->id,
                    'file_id' => $data['file_id'],
                ]);

                $firm = $firm->with ('agreements')->first();
                return $this->sendResponse ('FILES_UPLOADED', $firm);
            }
        }
    }

    /**
     * Get document
     *
     * @param Request $request
     *
     **/
    public function get_agreement (Request $request, string $guid='') {

        $firm = Firm::where ('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        // Read action — see Documents::get() above for why this is
        // access_business_account rather than manage_checklist.
        if (! $this->authorizeFirmScope($firm->id, 'documents.approve', 'access_business_account')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        // Validate the request...
        $rules = [
            'file_hash' => ['nullable', 'string'],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            $validated = $validator->validated();
            $file_hash = $validated['file_hash'] ?? '';
           

            // Get file record
         $firm = Firm::where('guid', $guid)->first();
           
          
            if (!$firm) {
                return $this->sendError('FIRM_NOT_FOUND', [], 404);
            }

            $agreements = $firm->agreements()->get();   // always returns a Collection

            if ($agreements->isEmpty()) {
                return $this->sendError('NO_AGREEMENTS_FOUND', [], 404);
            }

            return $this->sendResponse('AGREEMENTS_FOUND', $agreements);
        }
    }

    /**
     * Replace an existing agreement file
     */
    public function edit_agreement(Request $request, string $guid = '')
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'documents.approve', 'manage_checklist', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $max     = Config::get('files.max_upload_size');
        $allowed = collect(Config::get('files.allowed_types'))->flatten()->toArray();

        $rules = [
            'file_hash' => ['required', 'string', 'exists:files,file_hash'],
            'document'  => ['required', File::types($allowed)->max($max)],
            'alt'       => ['nullable', 'string', 'max:100'],
            'title'     => ['nullable', 'string', 'max:100'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $existingFile = FileModel::where('file_hash', $validated['file_hash'])
            ->where('group', 'agreement')
            ->first();

        if (! $existingFile) {
            return $this->sendError('AGREEMENT_FILE_NOT_FOUND', 200);
        }

        $linked = DB::table('firm_agreements')
            ->where('firm_id', $firm->id)
            ->where('file_id', $existingFile->id)
            ->exists();

        if (! $linked) {
            return $this->sendError('AGREEMENT_NOT_LINKED_TO_FIRM', 200);
        }

        if (! $request->file('document')->isValid()) {
            return $this->sendError('FILE_UPLOAD_FAILED');
        }

        $uploadedFile = $request->file('document');
        $extension    = $uploadedFile->extension();
        $name         = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
        $file_name    = Str::slug($name) . '.' . $extension;
        $path         = 'documents/' . $firm->guid . '/agreements';

        // Upload new file
        $data = (new Files())->store($request, $uploadedFile, 'agreement', $file_name, $path);

        // Swap pivot to new file, keep old file intact
        DB::table('firm_agreements')
            ->where('firm_id', $firm->id)
            ->where('file_id', $existingFile->id)
            ->update(['file_id' => $data['file_id']]);

        $agreements = $firm->agreements()->get();

        return $this->sendResponse('AGREEMENT_UPDATED', $agreements);
    }

    /**
     * Remove profile image
     */
    public function delete_agreement (Request $request, string $guid='') {

        $firm = Firm::where ('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'documents.approve', 'manage_checklist', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        // Validate the request...
        $rules = [
            'file_hash' => ['nullable', 'list'],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            $validated = $validator->validated();
            $files = $validated['file_hash'] ?? [];
            $deleted = 0;
            if (! empty ($files)) {
                foreach ($files as $file_hash) {
                    // Delete file record
                    $fileModel = FileModel::where (['file_hash'=>$file_hash, 'group'=>'agreement'])->first();
                    if ($fileModel) {
                        // Delete physical file
                        Storage::disk('s3')->delete($fileModel->file_path);
                        // Delete file record
                        $fileModel->delete();
                        // Disconnect from firm
                        DB::table('firm_agreements')->where (['firm_id'=>$firm->id, 'file_id'=>$fileModel->id])->delete();
                        $deleted++;
                    }
                    // Delete document record
                }
                if ($deleted > 0) {
                    return $this->sendResponse ('FILES_DELETED', []);
                } else {
                    return $this->sendError ('NO_FILES_DELETED');
                }
            }

            return $this->sendError ('NO_FILES_PROVIDED');
        }
    }

    /**
     * Download zip document
     *
     * @param Request $request
     *
     **/
    public function download_zip (Request $request, string $code='') {

        $checklist = Checklist::where (['code' => $code])->first();
        if (! $checklist) {
            return $this->sendError ('CHECKLIST_NOT_FOUND');
        }

        $firm = Firm::find ($checklist->firm_id);
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        // Read action (download is not a mutation) — see Documents::get() above
        // for why this is access_business_account rather than manage_checklist.
        if (! $this->authorizeFirmScope($firm->id, 'documents.approve', 'access_business_account')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $file = new Files();
        $path =  'documents/' . $firm->guid . '/' . $checklist->code;
        $name = 'documents_' . $checklist->code . '.zip';

        ActivityLog::record('firms', "bulk download of {$checklist->name} category from firm {$firm->firm_name}", null, auth()->id());

        return $file->downloadZipStream($path, $name);

    }

    /**
     * Resolve which firm a business-document file_hash belongs to, by walking
     * file -> documents row -> checklist_item -> firm. Returns null if the
     * hash doesn't resolve to a business document (e.g. wrong group, or
     * orphaned file) — callers should treat that as "not found/forbidden".
     */
    private function firmIdForFileHash (string $hash): ?int {
        $file = FileModel::where('file_hash', $hash)->first();
        if (! $file) {
            return null;
        }
        $document = Document::where('file_id', $file->id)->first();
        if (! $document) {
            return null;
        }
        $checklist = Checklist::find($document->checklist_id);
        return $checklist?->firm_id;
    }

    /* Get file record */
    public function getRecord (Request $request, string $hash='') {
        $file = FileModel::where (['file_hash'=>$hash])->first();
        if (! $file) {
            return $this->sendError ('FILE_NOT_FOUND');
        }

        // Business document — read action, see Documents::get() above for
        // why this is access_business_account rather than manage_checklist.
        $firmId = $this->firmIdForFileHash($hash);
        if ($firmId !== null) {
            if (! $this->authorizeFirmScope($firmId, 'documents.approve', 'access_business_account')) {
                return $this->sendError('UNAUTHORIZED', 403);
            }
        } else {
            // Not tied to a business checklist — check the Individual/Taxfiler
            // ownership path instead (tax_filer_documents), so a taxfiler can
            // read the record for their own personal tax document.
            $taxFilerDocument = TaxFilerDocument::where('file_id', $file->id)->first();
            if (! $taxFilerDocument || ! $this->authorizeUserScope($taxFilerDocument->user_id, 'tax-documents.view')) {
                return $this->sendError('UNAUTHORIZED', 403);
            }
        }

        DB::table('files_log')->updateOrInsert([
            'file_id' => $file->id,
            'user_id' => auth()->id(),
        ], [
            'last_accessed_on' => now(),
        ]);

        return $this->sendResponse ('FILE_FOUND', $file);
    }


    /* Update file record */
    public function updateRecord (Request $request, string $hash='') {
        $rules = [
            'file_hash' => ['required', 'string'],
            'title' => ["nullable", 'string', 'max:100'],
            'alt' => ["nullable", 'string', 'max:100'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
            $validated = $validator->validated();
            $file_hash = $validated['file_hash'];

            $firmId = $this->firmIdForFileHash($file_hash);
            if ($firmId === null || ! $this->authorizeFirmScope($firmId, 'documents.approve', 'manage_checklist', blockStaffWrite: true)) {
                return $this->sendError('UNAUTHORIZED', 403);
            }

            $data = [];
            if (isset($validated['title'])) {
                $data['title'] = $validated['title'];
            }
            if (isset($validated['alt'])) {
                $data['file_alt'] = $validated['alt'];
            }
            if (! empty ($data)) {
                $updated = (new Files())->updateRecord($file_hash, $data);
                if ($updated) {
                    if (isset($data['title'])) {
                        $file = FileModel::where('file_hash', $file_hash)->first();
                        ActivityLog::record('documents', "Edit the title of the document", $file->id ?? null, auth()->id());

                        if ($file) {
                            $this->notifyDocumentTitleUpdated($file);
                        }
                    }

                    return $this->sendResponse ('RECORD_UPDATED', []);
                } else {
                    return $this->sendError ('RECORD_UPDATE_FAILED');
                }
            } else {
                return $this->sendError ('NO_DATA_PROVIDED');
            }
        }
    }

    /**
     * Notify the firm's Client user(s) when a document's title is edited.
     * `updateRecord()` isn't firm-scoped by URL (keyed by file_hash only), so the
     * firm has to be resolved via documents -> checklist_items -> firm_id; if this
     * file isn't linked to a checklist document (e.g. a different files.group), skip silently.
     */
    private function notifyDocumentTitleUpdated(FileModel $file): void
    {
        $document = Document::where('file_id', $file->id)->first();
        if (! $document) {
            return;
        }

        $checklist = Checklist::find($document->checklist_id);
        if (! $checklist || ! $checklist->firm_id) {
            return;
        }

        $clients = User::where('firm_id', $checklist->firm_id)->role('Client')->get();

        foreach ($clients as $client) {
            Notification::record(
                $client->id,
                'Document title updated',
                "The title of a document was updated to \"{$file->title}\".",
                'document_title_updated',
                auth()->id()
            );
        }
    }

  public function reupload(Request $request, string $code = '')
{
    
   
    $checklist = Checklist::where(['code' => $code])->first();
    if (!$checklist) {
        return $this->sendError('CHECKLIST_NOT_FOUND');
    }

    $firm = Firm::find($checklist->firm_id);
    if (!$firm) {
        return $this->sendError('BUSINESS_NOT_FOUND');
    }
    if (! $this->authorizeFirmScope($firm->id, 'documents.approve', 'manage_checklist', blockStaffWrite: true)) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $max = Config::get('files.max_upload_size');
    $allowed = Config::get('files.allowed_types');
    $allowed = collect($allowed)->flatten()->toArray();

    $rules = [
        'document' => ['required', File::types($allowed)->max($max)],
        'alt' => ['nullable', 'string', 'max:100'],
        'title' => ['nullable', 'string', 'max:100'],
       // 'year' => ['nullable', 'digits:4'],
       // 'month' => ['nullable', 'between:1,12'],
        'file_hash' => ['required', 'exists:files,file_hash'],
        
    ];

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails()) {
        return $this->sendError($validator->errors());
    }

    $validated = $validator->validated();
    $group = 'document';
    $path = 'documents/' . $firm->guid . '/' . $checklist->code;
    $hash=$validated['file_hash'];

    if ($request->file('document')->isValid()) {

        $uploadedFile = $request->file('document');
        $extension = $uploadedFile->extension();
        $name = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
        $file_name = Str::slug($name) . '.' . $extension;

        $files = new Files();

        /**
         * CHECK EXISTING  FILE
         */
        $existingFile = FileModel::where('file_hash', $hash)->first();

    if ($existingFile) 
    {

    /**
     * FIND DOCUMENT USING OLD FILE
     */
    $existingDocument = Document::where('file_id', $existingFile->id)->where('checklist_id',$checklist->id)->first();

    /**
     * A bulk-uploaded (Admin/Accountant) document is locked at 'approved' —
     * reupload would replace the file and create a fresh row back at
     * 'pending', which is exactly the status change the lock exists to
     * prevent, so it's refused here too rather than only in status().
     */
    if ($existingDocument && $existingDocument->status_locked) {
        return $this->sendError('DOCUMENT_STATUS_LOCKED');
    }

    if ($existingDocument)
     {
    
        $data = $files->store($request, $uploadedFile, $group, $file_name, $path);
        /**
         * UPDATE DOCUMENT TABLE
         */
        Document::create([
        'checklist_id' => $checklist->id,
        'file_id' => $data['file_id'],
        'uploaded_by' => auth()->id(),
        'status' => 'pending',
        'comments' => '',
        'year' => $validated['year'] ?? date('Y'),
        'month' => $validated['month'] ?? date('n'),
        ]);
    }

    /**
     * OPTIONAL: DELETE OLD FILE RECORD
     */
    
    $existingFile->delete();
     return $this->sendResponse('FILES_UPLOADED', $data);

    } 

   
    }
    return $this->sendError('FILE_NOTUPLOADED');
}

public function getTotalDocuments($guid)
{
    $firm = Firm::where('guid', $guid)->firstOrFail();

    // Read action (a count, not a mutation) — see Documents::get() above for
    // why this is access_business_account rather than manage_checklist.
    if (! $this->authorizeFirmScope($firm->id, 'documents.approve', 'access_business_account')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $count = DB::table('documents as d')
        ->join('checklist_items as ci', 'ci.id', '=', 'd.checklist_id')
        ->where('ci.firm_id', $firm->id)
        ->whereNull('d.deleted_at')
        ->count('d.id');

    return response()->json([
        'total_documents' => $count
    ]);
}
public function getPendingDocuments($guid)
{
    $firm = Firm::where('guid', $guid)->firstOrFail();

    // Read action (a count, not a mutation) — see Documents::get() above for
    // why this is access_business_account rather than manage_checklist.
    if (! $this->authorizeFirmScope($firm->id, 'documents.approve', 'access_business_account')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    $count = DB::table('documents as d')
        ->join('checklist_items as ci', 'ci.id', '=', 'd.checklist_id')
        ->where('ci.firm_id', $firm->id)
        ->where('d.status', 'pending')
        ->whereNull('d.deleted_at')
        ->count('d.id');

    return response()->json([
        'pending_documents' => $count
    ]);
}

public function getRecentBusinessDocuments()
{
    if (! auth()->user()->can('documents.approve')) {
        return $this->sendError('UNAUTHORIZED', 403);
    }

    // Admin sees recent uploads across the whole practice; Accountant/Staff
    // instead see only firms they hold an org-role assignment on — same "my
    // clients" scope as Users::getRecent()/getBusinessCount()/getStaffCount().
    $firmScope = '';
    $bindings  = [];
    if (! auth()->user()->hasRole('Admin')) {
        $firmIds = $this->myAssignedFirmIds();
        if ($firmIds->isEmpty()) {
            return $this->sendResponse('RECORDS_FOUND', []);
        }
        $firmScope = ' AND ci.firm_id IN (' . implode(',', array_fill(0, $firmIds->count(), '?')) . ')';
        $bindings  = $firmIds->all();
    }

    $records = DB::select("
        SELECT firm_name, file_title, status, created_at
        FROM (
            SELECT
                f.firm_name,
                fi.title AS file_title,
                d.status,
                d.created_at,
                ROW_NUMBER() OVER (PARTITION BY f.id ORDER BY d.created_at DESC) AS row_num
            FROM documents d
            JOIN checklist_items ci ON ci.id = d.checklist_id
            JOIN firms f ON f.id = ci.firm_id
            JOIN files fi ON fi.id = d.file_id
            WHERE ci.firm_id IS NOT NULL
              AND d.deleted_at IS NULL
              AND f.deleted_at IS NULL
              AND fi.deleted_at IS NULL
              $firmScope
        ) ranked
        WHERE row_num <= 2
        ORDER BY created_at DESC
        LIMIT 5
    ", $bindings);

    return $this->sendResponse('RECORDS_FOUND', $records);
}
}

