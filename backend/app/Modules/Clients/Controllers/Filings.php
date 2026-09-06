<?php

namespace App\Modules\Clients\Controllers;

use App\Http\Controllers\BaseController;
use App\Models\User;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Clients\Models\Filing;
use App\Modules\Clients\Models\FilingDocument;
use App\Modules\Clients\Models\Firm;
use App\Modules\Clients\Models\FirmSubTaxCategoryCode;
use App\Modules\Files\Controllers\Files;
use App\Modules\Notifications\Models\Notification;
use App\Modules\Organizations\Models\OrganizationUserAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;
use Validator;

class Filings extends BaseController
{
    public function reviewCodes(Request $request, int $firm_id)
    {
        $firm = Firm::find($firm_id);
        if (! $firm) {
            return $this->sendError('FIRM_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($firm_id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'year' => ['nullable', 'digits:4'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $year = $validator->validated()['year'] ?? null;

        // Codes saved before the year column existed (or without one specified)
        // have year = null — treat those as unscoped/current rather than
        // silently hiding them whenever a specific year is requested.
        $codes = FirmSubTaxCategoryCode::with('checklistItem')
            ->where('firm_id', $firm_id)
            ->when($year, fn ($q) => $q->where(fn ($sub) => $sub->where('year', $year)->orWhereNull('year')))
            ->orderBy('checklist_item_id')
            ->orderBy('code')
            ->get();

        $data = $codes->map(fn ($record) => [
            'id'                   => $record->id,
            'checklist_item_id'    => $record->checklist_item_id,
            'checklist_item_code'  => $record->checklistItem->code ?? null,
            'checklist_item_name'  => $record->checklistItem->name ?? null,
            'code'                 => $record->code,
            'value'                => $record->value,
            'status'               => $record->status,
        ])->values();

        return $this->sendResponse('RECORDS_FOUND', [
            'firm' => ['id' => $firm->id, 'guid' => $firm->guid, 'firm_name' => $firm->firm_name],
            'year' => $year,
            'data' => $data,
            'net_total' => $codes->sum('value'),
        ]);
    }

    public function start(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'firm_id'     => ['required', 'integer', 'exists:firms,id'],
            'year'        => ['required', 'digits:4'],
            'filing_type' => ['required', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        if (! $this->authorizeFirmScope($validated['firm_id'], 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $existing = Filing::where('firm_id', $validated['firm_id'])
            ->where('year', $validated['year'])
            ->where('filing_type', $validated['filing_type'])
            ->first();

        if ($existing) {
            return $this->sendResponse('FILING_ALREADY_STARTED', [
                'filing_id' => $existing->id,
                'status'    => $existing->status,
            ]);
        }

        $filing = Filing::create([
            'firm_id'     => $validated['firm_id'],
            'year'        => $validated['year'],
            'filing_type' => $validated['filing_type'],
            'status'      => 'draft',
            'started_by'  => auth()->id(),
        ]);

        ActivityLog::record(
            'filings',
            "started {$validated['filing_type']} filing for {$validated['year']}",
            null,
            auth()->id()
        );

        return $this->sendResponse('FILING_STARTED', [
            'filing_id' => $filing->id,
            'status'    => $filing->status,
        ]);
    }

    public function uploadForm(Request $request, int $filing_id)
    {
        $filing = Filing::with('firm')->find($filing_id);
        if (! $filing) {
            return $this->sendError('FILING_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($filing->firm_id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'document' => ['required', File::types(['pdf'])->max(Config::get('files.max_upload_size'))],
            'title'    => ['nullable', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $uploadedFile = $request->file('document');
        $extension    = $uploadedFile->extension();
        $name         = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
        $file_name    = Str::slug($name) . '.' . $extension;
        $path         = 'filings/' . $filing->firm->guid . '/' . $filing->id;

        $data = (new Files())->store($request, $uploadedFile, 'document', $file_name, $path);

        $document = FilingDocument::create([
            'filing_id'     => $filing->id,
            'document_type' => 'generated',
            'file_id'       => $data['file_id'],
            'uploaded_by'   => auth()->id(),
        ]);

        $filing->status  = 'sent';
        $filing->sent_at = now();
        $filing->save();

        $this->notifyFirmClients($filing->firm, 'Filing sent', "Your {$filing->year} {$filing->filing_type} filing is ready to review and sign.", 'filing_sent', $filing->id);

        ActivityLog::record('filings', "sent {$filing->filing_type} filing for {$filing->year} to client", null, auth()->id());

        return $this->sendResponse('FILING_SENT', [
            'filing_id'  => $filing->id,
            'status'     => $filing->status,
            'document_id' => $document->id,
            'file_url'   => $data['file_url'],
            'title'      => $data['title'],
        ]);
    }

    /**
     * Alternate to uploadForm() — sends the filing to the client via an
     * external link (e.g. a DocuSign envelope) instead of an uploaded file.
     */
    public function sendLink(Request $request, int $filing_id)
    {
        $filing = Filing::with('firm')->find($filing_id);
        if (! $filing) {
            return $this->sendError('FILING_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($filing->firm_id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'document_send_status'  => ['required', 'in:link,signed_document'],
            'link'                  => ['nullable', 'url', 'max:255', 'required_if:document_send_status,link'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $isLink    = $validated['document_send_status'] === 'link';

        $document = FilingDocument::create([
            'filing_id'             => $filing->id,
            'document_type'         => 'generated',
            'document_send_status'  => $validated['document_send_status'],
            'link'                  => $isLink ? $validated['link'] : null,
            'uploaded_by'           => auth()->id(),
        ]);

        $filing->status  = 'sent';
        $filing->sent_at = now();
        $filing->save();

        $this->notifyFirmClients($filing->firm, 'Filing sent', "Your {$filing->year} {$filing->filing_type} filing is ready to review and sign.", 'filing_sent', $filing->id);

        $sendMethod = $isLink ? 'via link' : 'as signed document';
        ActivityLog::record('filings', "sent {$filing->filing_type} filing for {$filing->year} to client {$sendMethod}", null, auth()->id());

        return $this->sendResponse('FILING_SENT', [
            'filing_id'             => $filing->id,
            'status'                => $filing->status,
            'document_id'           => $document->id,
            'link'                  => $document->link,
            'document_send_status'  => $document->document_send_status,
        ]);
    }

    public function status(int $filing_id)
    {
        $filing = Filing::with(['firm', 'documents' => function ($query) {
            $query->orderByDesc('created_at');
        }])->find($filing_id);

        if (! $filing) {
            return $this->sendError('FILING_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($filing->firm_id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        return $this->sendResponse('RECORDS_FOUND', $this->formatFilingStatus($filing));
    }

    /**
     * Most recent filing for a firm — lets the client board / client review
     * screen land on "my current filing" without already knowing its id.
     */
    public function latestForFirm(int $firm_id)
    {
        if (! $this->authorizeFirmScope($firm_id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $filing = Filing::with(['firm', 'documents' => function ($query) {
            $query->orderByDesc('created_at');
        }])->where('firm_id', $firm_id)->orderByDesc('created_at')->first();

        if (! $filing) {
            return $this->sendError('NO_FILING_FOUND', 200);
        }

        return $this->sendResponse('RECORDS_FOUND', $this->formatFilingStatus($filing));
    }

    /**
     * Individual documents (filing_documents, document_type = 'generated')
     * sent to this firm's client for confirmation/signature that haven't
     * been confirmed yet — i.e. still attached to a filing whose status is
     * 'sent'. Admin/Accountant can add several documents across one or more
     * filings for an organisation; this lists every individual one still
     * awaiting the client's signature, for that organisation's page. Same
     * read scope as latestForFirm()/status() (Admin/Accountant any firm,
     * Client/Employee own firm only). Complements pendingSignatures()
     * (cross-firm, one row per filing) with a per-firm, per-document view.
     */
    public function pendingDocuments(string $guid = '')
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        if (! $this->authorizeFirmScope($firm->id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $documents = FilingDocument::with(['file', 'filing'])
            ->where('document_type', 'generated')
            ->whereHas('filing', function ($query) use ($firm) {
                $query->where('firm_id', $firm->id)->where('status', 'sent');
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($doc) => [
                'id'                    => $doc->id,
                'filing_id'             => $doc->filing_id,
                'filing_type'           => $doc->filing->filing_type ?? null,
                'year'                  => $doc->filing->year ?? null,
                'title'                 => $doc->file->title ?? null,
                'doc_name'              => $doc->file->title ?? $doc->file->file_name ?? null,
                'file_url'              => $doc->file->file_path ?? null,
                'document_send_status'  => $doc->document_send_status,
                'link'                  => $doc->link,
                'uploaded_by'           => $doc->uploaded_by,
                'created_at'            => $doc->created_at,
            ]);

        return $this->sendResponse('RECORDS_FOUND', $documents);
    }

    private function formatFilingStatus(Filing $filing): array
    {
        $documents = $filing->documents->map(fn ($doc) => [
            'id'            => $doc->id,
            'document_type' => $doc->document_type,
            'file_id'       => $doc->file_id,
            'file_url'      => $doc->file->file_path ?? null,
            'file_name'     => $doc->file->file_name ?? null,
            'title'         => $doc->file->title ?? null,
            'document_send_status' => $doc->document_send_status,
            'link'          => $doc->link,
            'uploaded_by'   => $doc->uploaded_by,
            'created_at'    => $doc->created_at,
        ])->filter(fn ($doc) => $doc['file_id'] !== null || $doc['file_url'] !== null || $doc['file_name'] !== null || $doc['title'] !== null)
            ->values();

        return [
            'filing' => [
                'id'                      => $filing->id,
                'firm_id'                 => $filing->firm_id,
                'firm_name'               => $filing->firm->firm_name ?? null,
                'year'                    => $filing->year,
                'filing_type'             => $filing->filing_type,
                'status'                  => $filing->status,
                'sent_at'                 => $filing->sent_at,
                'signed_at'               => $filing->signed_at,
                'filed_at'                => $filing->filed_at,
                'cra_confirmation_number' => $filing->cra_confirmation_number,
            ],
            'documents' => $documents,
        ];
    }

    public function uploadSigned(Request $request, int $filing_id)
    {
        $filing = Filing::with('firm')->find($filing_id);
        if (! $filing) {
            return $this->sendError('FILING_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($filing->firm_id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'document' => ['required', File::types(['pdf'])->max(Config::get('files.max_upload_size'))],
            'title'    => ['nullable', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $uploadedFile = $request->file('document');
        $extension    = $uploadedFile->extension();
        $name         = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
        $file_name    = Str::slug($name) . '.' . $extension;
        $path         = 'filings/' . $filing->firm->guid . '/' . $filing->id;

        $data = (new Files())->store($request, $uploadedFile, 'document', $file_name, $path);

        $document = FilingDocument::create([
            'filing_id'     => $filing->id,
            'document_type' => 'signed',
            'file_id'       => $data['file_id'],
            'uploaded_by'   => auth()->id(),
        ]);

        $filing->status    = 'signed';
        $filing->signed_at = now();
        $filing->save();

        $isClient = auth()->user()->firm_id === $filing->firm_id && auth()->user()->hasRole('Client');
        if ($isClient) {
            $this->notifyFirmStaff($filing->firm, 'Filing signed', "The client has signed the {$filing->year} {$filing->filing_type} filing.", 'filing_signed', $filing->id);
        }

        ActivityLog::record('filings', "uploaded signed copy for {$filing->filing_type} filing for {$filing->year}", null, auth()->id());

        return $this->sendResponse('FILING_SIGNED', [
            'filing_id'    => $filing->id,
            'status'       => $filing->status,
            'document_id'  => $document->id,
            'file_url'     => $data['file_url'],
            'title'        => $data['title'],
        ]);
    }

    /**
     * List the CRA proof-of-filing documents (document_type = 'cra_filed')
     * for a filing. Same read scope as signedDocuments()/linkDocuments()
     * (Admin/Accountant any firm, Client/Employee own firm) — uploading
     * stays staff-only via uploadCraDocument(), this is read-only.
     */
    public function craDocuments(int $filing_id)
    {
        $filing = Filing::find($filing_id);
        if (! $filing) {
            return $this->sendError('FILING_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($filing->firm_id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $documents = FilingDocument::with('file')
            ->where('filing_id', $filing_id)
            ->where('document_type', 'cra_filed')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($doc) => [
                'id'          => $doc->id,
                'doc_name'    => $doc->file->title ?? $doc->file->file_name ?? null,
                'file_url'    => $doc->file->file_path ?? null,
                'uploaded_by' => $doc->uploaded_by,
                'uploaded_at' => $doc->created_at,
            ]);

        return $this->sendResponse('RECORDS_FOUND', $documents);
    }

    /**
     * List the link-sent document links (e.g. DocuSign envelope links) for a
     * filing, for the client portal. Same read scope as signedDocuments()
     * (Admin/Accountant any firm, Client/Employee own firm).
     */
    public function linkDocuments(int $filing_id)
    {
        $filing = Filing::find($filing_id);
        if (! $filing) {
            return $this->sendError('FILING_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($filing->firm_id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $links = FilingDocument::where('filing_id', $filing_id)
            ->where('document_type', 'generated')
            ->where('document_send_status', 'link')
            ->orderByDesc('created_at')
            ->pluck('link')
            ->values();

        return $this->sendResponse('RECORDS_FOUND', $links);
    }

    /**
     * List the signed documents for a filing, for Admin/Accountant review.
     */
    public function signedDocuments(int $filing_id)
    {
        $filing = Filing::find($filing_id);
        if (! $filing) {
            return $this->sendError('FILING_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($filing->firm_id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $documents = FilingDocument::with('file')
            ->where('filing_id', $filing_id)
            ->where('document_type', 'signed')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($doc) => [
                'id'          => $doc->id,
                'title'       => $doc->file->title ?? null,
                'doc_name'    => $doc->file->title ?? $doc->file->file_name ?? null,
                'file_url'    => $doc->file->file_path ?? null,
                'status'      => $doc->status,
                'comment'     => $doc->comment,
                'uploaded_at' => $doc->created_at,
            ]);

        return $this->sendResponse('RECORDS_FOUND', $documents);
    }

    /**
     * Filings sent to the client for signature that haven't been signed yet
     * (status = 'sent' — the document was generated/sent via uploadForm()/
     * sendLink() but no signed copy has come back through uploadSigned()).
     * Admin sees every firm; Accountant/Staff see only firms they hold an
     * org-role assignment on ("my clients", same scope as
     * Documents::getRecentBusinessDocuments()); Client/Employee see only
     * their own firm's pending filings.
     */
    public function pendingSignatures()
    {
        $user = auth()->user();

        $query = Filing::with('firm:id,guid,firm_name')
            ->where('status', 'sent')
            ->orderByDesc('sent_at');

        if ($user->hasRole('Admin')) {
            // No scope — every firm.
        } elseif ($this->isFirmStaff('firms.manage')) {
            $query->whereIn('firm_id', $this->myAssignedFirmIds());
        } else {
            if (! $user->firm_id) {
                return $this->sendResponse('RECORDS_FOUND', []);
            }
            $query->where('firm_id', $user->firm_id);
        }

        $data = $query->get()->map(fn ($filing) => [
            'id'          => $filing->id,
            'firm_id'     => $filing->firm_id,
            'firm_name'   => $filing->firm->firm_name ?? null,
            'year'        => $filing->year,
            'filing_type' => $filing->filing_type,
            'status'      => $filing->status,
            'sent_at'     => $filing->sent_at,
        ]);

        return $this->sendResponse('RECORDS_FOUND', $data);
    }

    /**
     * Admin/Accountant approves or rejects a signed document. Rejecting
     * notifies the client (with the comment as the reason) so they know to
     * re-sign/re-upload.
     *
     * Requires isFirmStaff() in addition to authorizeFirmScope() — the latter
     * alone falls through to "own firm" for Client/Employee, which would let
     * a client set their own document's review status. Status changes are a
     * staff-only action.
     */
    public function updateDocumentStatus(Request $request, int $filing_id, int $document_id)
    {
        $filing = Filing::with('firm')->find($filing_id);
        if (! $filing) {
            return $this->sendError('FILING_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($filing->firm_id, 'firms.manage') || ! $this->isFirmStaff('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $document = FilingDocument::where('filing_id', $filing_id)
            ->where('id', $document_id)
            ->where('document_type', 'signed')
            ->first();

        if (! $document) {
            return $this->sendError('DOCUMENT_NOT_FOUND', 404);
        }

        $validator = Validator::make($request->all(), [
            'status'  => ['required', 'in:pending,approved,rejected'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        $document->status  = $validated['status'];
        $document->comment = $validated['comment'] ?? $document->comment;
        $document->save();

        if ($validated['status'] === 'rejected') {
            $reason = ! empty($validated['comment']) ? " Reason: {$validated['comment']}" : '';
            $this->notifyFirmClients(
                $filing->firm,
                'Signed document rejected',
                "Your signed {$filing->year} {$filing->filing_type} document was rejected.{$reason}",
                'filing_document_rejected',
                $filing->id
            );
        }

        ActivityLog::record('filings', "set signed document #{$document->id} status to {$document->status} for {$filing->filing_type} filing", null, auth()->id());

        return $this->sendResponse('DOCUMENT_STATUS_UPDATED', [
            'id'      => $document->id,
            'status'  => $document->status,
            'comment' => $document->comment,
        ]);
    }

    /**
     * Step 5 of the filing lifecycle — Admin/Accountant marks the filing as
     * filed with CRA. Staff-only: authorizeFirmScope() alone would fall
     * through to "own firm" for Client/Employee, same reasoning as
     * updateDocumentStatus(). The CRA proof-of-filing document itself is
     * uploaded separately via uploadCraDocument() — decoupled so a document
     * can be attached without forcing filing.status to 'filed'.
     */
    public function markFiled(Request $request, int $filing_id)
    {
        $filing = Filing::with('firm')->find($filing_id);
        if (! $filing) {
            return $this->sendError('FILING_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($filing->firm_id, 'firms.manage') || ! $this->isFirmStaff('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'cra_confirmation_number' => ['nullable', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        $filing->status                  = 'filed';
        $filing->filed_at                = now();
        $filing->cra_confirmation_number = $validated['cra_confirmation_number'] ?? $filing->cra_confirmation_number;
        $filing->save();

        $this->notifyFirmClients($filing->firm, 'Filing completed', "Your {$filing->year} {$filing->filing_type} filing has been submitted to CRA.", 'filing_completed', $filing->id);

        ActivityLog::record('filings', "marked {$filing->filing_type} filing for {$filing->year} as filed", null, auth()->id());

        return $this->sendResponse('FILING_MARKED_FILED', [
            'filing_id' => $filing->id,
            'status'    => $filing->status,
            'cra_confirmation_number' => $filing->cra_confirmation_number,
        ]);
    }

    /**
     * Admin/Accountant uploads the CRA proof-of-filing document
     * (document_type = 'cra_filed'), independent of markFiled() so it can be
     * attached at any point in the lifecycle without changing filing.status.
     */
    public function uploadCraDocument(Request $request, int $filing_id)
    {
        $filing = Filing::with('firm')->find($filing_id);
        if (! $filing) {
            return $this->sendError('FILING_NOT_FOUND', 404);
        }

        if (! $this->authorizeFirmScope($filing->firm_id, 'firms.manage') || ! $this->isFirmStaff('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'document' => ['required', File::types(['pdf'])->max(Config::get('files.max_upload_size'))],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $uploadedFile = $request->file('document');
        $extension    = $uploadedFile->extension();
        $name         = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
        $file_name    = Str::slug($name) . '.' . $extension;
        $path         = 'filings/' . $filing->firm->guid . '/' . $filing->id;

        $data = (new Files())->store($request, $uploadedFile, 'document', $file_name, $path);

        $document = FilingDocument::create([
            'filing_id'     => $filing->id,
            'document_type' => 'cra_filed',
            'file_id'       => $data['file_id'],
            'uploaded_by'   => auth()->id(),
        ]);

        ActivityLog::record('filings', "uploaded CRA document for {$filing->filing_type} filing for {$filing->year}", null, auth()->id());

        return $this->sendResponse('CRA_DOCUMENT_UPLOADED', [
            'filing_id'   => $filing->id,
            'document_id' => $document->id,
            'file_url'    => $data['file_url'],
        ]);
    }

    private function notifyFirmClients(Firm $firm, string $title, string $message, string $type, ?int $filingId = null): void
    {
        $recipients = User::where('firm_id', $firm->id)->role('Client')->get();

        foreach ($recipients as $recipient) {
            Notification::record($recipient->id, $title, $message, $type, auth()->id(), $filingId);
        }
    }

    /**
     * Admin sees every firm regardless of assignment (same bypass used
     * throughout the app), but Accountants only get notified for firms
     * they're actually assigned to via organization_user_assignments —
     * previously this fanned out to every Accountant on the platform.
     */
    private function notifyFirmStaff(Firm $firm, string $title, string $message, string $type, ?int $filingId = null): void
    {
        $assignedAccountantIds = OrganizationUserAssignment::where('firm_id', $firm->id)->pluck('user_id');

        $recipients = User::role('Admin')->get()
            ->merge(User::whereIn('id', $assignedAccountantIds)->role('Accountant')->get())
            ->unique('id');

        foreach ($recipients as $recipient) {
            Notification::record($recipient->id, $title, $message, $type, auth()->id(), $filingId);
        }
    }
}
