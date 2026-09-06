<?php

namespace App\Modules\Files\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;
use App\Http\Controllers\BaseController;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Zip;
use Validator;

use App\Modules\Files\Models\File As FileModel;
use App\Modules\Clients\Models\Document;
use App\Modules\Clients\Models\FilingDocument;
use App\Modules\Reports\Models\ReportDocument;

class Files extends BaseController {

    /**
     * A Client (or other firm-scoped, non-staff) user can view a file that
     * isn't theirs if it's attached to a filing belonging to their own firm
     * — e.g. the generated filing PDF an accountant sends them to sign,
     * which is uploaded by the accountant, not the client.
     */
    private function isFilingDocumentForUsersFirm(int $fileId, \App\Models\User $user): bool
    {
        if (! $user->firm_id) {
            return false;
        }

        return FilingDocument::where('file_id', $fileId)
            ->whereHas('filing', fn ($q) => $q->where('firm_id', $user->firm_id))
            ->exists();
    }

    /**
     * Same reasoning as isFilingDocumentForUsersFirm(), for the P&L/Balance
     * Sheet PDF uploads an accountant makes on a Client's dashboard
     * (ProfitLoss::uploadPdf/BalanceSheet::uploadPdf) — those are also
     * uploaded by the accountant, not the client viewing them.
     */
    private function isReportDocumentForUsersFirm(int $fileId, \App\Models\User $user): bool
    {
        if (! $user->firm_id) {
            return false;
        }

        return ReportDocument::where('file_id', $fileId)
            ->where('organization_id', $user->firm_id)
            ->exists();
    }

    /**
     * Same reasoning as isFilingDocumentForUsersFirm(), for firm agreement
     * PDFs — those are uploaded by the accountant (Documents::upload_agreement),
     * not the client viewing them, and linked via the firm_agreements pivot
     * rather than created_by.
     */
    private function isAgreementForUsersFirm(int $fileId, \App\Models\User $user): bool
    {
        if (! $user->firm_id) {
            return false;
        }

        return DB::table('firm_agreements')
            ->where('file_id', $fileId)
            ->where('firm_id', $user->firm_id)
            ->exists();
    }

    /**
     * A firm's own Employee can view a checklist document belonging to that
     * firm, regardless of who uploaded it.
     *
     * This exists because 'Employee' was removed from the staff bypass in
     * stream(): until the payroll module, holding that role short-circuited
     * every per-file ownership check for every file in the system, in any
     * firm. Employee legitimately holds documents.view/documents.upload and
     * has a Documents item in its menu, so the access it actually needs is
     * granted narrowly here instead.
     *
     * Deliberately NOT extended to Client. Client was never in the staff
     * bypass, so today a Client only sees documents they uploaded themselves
     * — widening that is a product decision, not a side effect of this fix.
     */
    private function isChecklistDocumentForUsersFirm(int $fileId, \App\Models\User $user): bool
    {
        if (! $user->firm_id) {
            return false;
        }

        return Document::where('file_id', $fileId)
            ->whereExists(function ($q) use ($user) {
                $q->select(DB::raw(1))
                    ->from('checklist_items')
                    ->whereColumn('checklist_items.id', 'documents.checklist_id')
                    ->where('checklist_items.firm_id', $user->firm_id);
            })
            ->exists();
    }

    public function get (int $file_id=0) {
        $file = FileModel::where ('id', $file_id)->first();
        if ($file) {
            return $file;
        } else {
            return null;
        }
    }

    public function store(Request $request, $uploadedFile, string $group = '', $file_name = null, $path = '', ?string $visibility = null) {

        $now = now();
        $data = [];

        $disk = Storage::disk('s3');
        $aws_root_path = Config::get('files.aws_root_path');
        
       
        $path =  $aws_root_path.'/'.trim($path, '/');
       
       if ($path === '') {
            throw new \InvalidArgumentException('Invalid storage path');
        }

        if ($uploadedFile->isValid()) {
            $file_name = $uploadedFile->getClientOriginalName() ?? $uploadedFile->hashName();
            $alt = $request->input('alt');
            $stored = $disk->putFileAs($path, $uploadedFile, $file_name);
        
            $data = [
                'group'       => $group,
                'file_name'   => $file_name,
                'file_path'   => $path . '/' . $file_name,
                'file_size'   => $uploadedFile->getSize(),
                'file_type'   => $uploadedFile->getMimeType(),
                'file_hash'   => $uploadedFile->hashName(),
                'file_alt'    => $request->input('alt'),
                'title'       => $request->input('title'),
                'created_at'  => $now,
                'created_by'  => auth()->id(),
                'updated_at'  => $now,
                'updated_by'  => auth()->id(),
            ];

            $file_id = $this->saveRecord($data);
            $data['file_id'] = $file_id;
            $data['file_url'] = URL::temporarySignedRoute(
                'files.stream',
                now()->addMinutes(10),
                ['file_id' => $file_id, 'uid' => auth()->id()]
            );

            return $data;
        }

        if (!$storedPath) {
            throw new \Exception('File upload failed to DigitalOcean Spaces');
        }

    }

    public function stream(Request $request, int $file_id) {

        $file = FileModel::where('id', $file_id)->firstOrFail();

        // Public asset groups — signed URL is sufficient, no user auth needed
        $publicGroups = ['logo', 'favicon'];
        if (in_array($file->group, $publicGroups)) {
            // Skip all user checks — fall through to streaming
        } else {
            // Step 1 — resolve the user: prefer uid baked into the signed URL,
            // fall back to Bearer token for URLs generated by older server code.
            $userId = (int) $request->query('uid');

            if (!$userId) {
                // Older URLs have no uid — authenticate via Bearer token directly
                // (auth:sanctum middleware is not on this route, so we look up the token manually)
                $rawToken = $request->bearerToken();
                if (!$rawToken) {
                    return response()->json(['message' => 'Unauthorized.'], 401);
                }

                $pat = DB::table('personal_access_tokens')
                    ->where('token', hash('sha256', $rawToken))
                    ->where('tokenable_type', 'App\\Models\\User')
                    ->first();

                if (!$pat) {
                    return response()->json(['message' => 'Unauthorized.'], 401);
                }

                $userId = (int) $pat->tokenable_id;
            } else {
                // Step 2 — uid is present; verify the session is still active.
                // Two ways to prove that: (a) the `web` session guard resolves to this
                // same user right now — true for browser/cookie clients, since Login::login()
                // calls Auth::login() into the `web` guard and config('sanctum.guard') checks
                // `web` before the token, so those requests never touch personal_access_tokens
                // at all; or (b) a personal_access_tokens row for this user was used recently —
                // true for pure Bearer-token clients that never touch the session guard.
                $isLoggedIn = (auth()->guard('web')->check() && auth()->guard('web')->id() === $userId)
                    || DB::table('personal_access_tokens')
                        ->where('tokenable_id', $userId)
                        ->where('tokenable_type', 'App\\Models\\User')
                        ->where('last_used_at', '>=', now()->subMinutes(10))
                        ->exists();

                if (!$isLoggedIn) {
                    return response()->json(['message' => 'Session expired. Please log in again.'], 401);
                }
            }

            // Step 3 — role / ownership check
            $user = \App\Models\User::find($userId);

            // 'Employee' is deliberately NOT here. It used to be, which meant
            // any Employee-role account bypassed every ownership check below
            // for every file in the system — including other firms' documents.
            // Employee is a firm-scoped role, not staff; the access it actually
            // needs comes from isChecklistDocumentForUsersFirm() instead.
            $staffRoles = ['Admin', 'Accountant', 'Staff'];

            $canAccess = $user->hasRole($staffRoles)
                      || $file->created_by === $user->id
                      || $this->isFilingDocumentForUsersFirm($file->id, $user)
                      || $this->isReportDocumentForUsersFirm($file->id, $user)
                      || $this->isAgreementForUsersFirm($file->id, $user)
                      || ($user->hasRole('Employee') && $this->isChecklistDocumentForUsersFirm($file->id, $user));

            if (!$canAccess) {
                return response()->json(['message' => 'Forbidden. You do not have access to this file.'], 403);
            }
        }

        // Step 4 — stream from S3
        $disk     = Storage::disk('s3');
        $rawPath  = $file->getRawOriginal('file_path');

        if (!$disk->exists($rawPath)) {
            return response()->json(['success' => false, 'message' => 'File not found'], 404);
        }

        $mimeType      = $file->file_type ?? 'application/octet-stream';
        $fileName      = $file->file_name ?? basename($rawPath);
        $allowedOrigin = config('app.frontend_url', '*');

        return response()->stream(function () use ($disk, $rawPath) {
            $stream = $disk->readStream($rawPath);
            if ($stream) {
                fpassthru($stream);
                fclose($stream);
            }
        }, 200, [
            'Content-Type'                => $mimeType,
            'Content-Disposition'         => 'inline; filename="' . $fileName . '"',
            'Cache-Control'               => 'no-store, no-cache, private',
            'Access-Control-Allow-Origin' => $allowedOrigin,
        ]);
    }

    public function delete (string $file_path='') {
        Storage::disk('s3')->delete($file_path);
    }

    public function unlink (int $file_id=0) {
        FileModel::where('id', $file_id)->delete();
    }

    public function saveRecord ($data=[]) {
        $id = FileModel::insertGetId ($data);
        return $id;
    }

    public function updateRecord ($hash='', $data=[]) {
        $updated = FileModel::where('file_hash', $hash)->update($data);
        return $updated;
    }


    public function downloadZipStream($path = '', $name='streamed_files.zip') {
        $s3Files = Storage::disk('s3')->files($path);
        $zip = Zip::create($name);
        foreach ($s3Files as $file) {
            $zip->addFromDisk('s3', $file, basename($file));
        }
        return $zip;
    }

    // check if the file is newly uploaded or already view by the user
    public function isNew (int $file_id=0, int $user_id=0) {
        $file = DB::table('files_log')->where(['file_id' => $file_id, 'user_id' => $user_id])->first();
        if ($file) {
            return false;
        }
        return true;
    }

}
