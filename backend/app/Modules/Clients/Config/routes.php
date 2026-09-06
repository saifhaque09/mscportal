<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Modules\Clients\Controllers\Firms;
use App\Modules\Clients\Controllers\Checklists;
use App\Modules\Clients\Controllers\Documents;
use App\Modules\Clients\Controllers\FirmSubTaxCategoryCode;
use App\Modules\Clients\Controllers\Filings;
use App\Modules\Clients\Controllers\Payments;

use App\Modules\Users\Controllers\Users;
use App\Modules\Users\Controllers\Invites;

// Protected routes
Route::middleware(['auth:sanctum'])->group(function () {

    Route::controller(Firms::class)->prefix('business')->group(function () {
        Route::post("/create", "create")->name('clients.business.create');
        Route::post("/tax-return-occurrences", "getTaxReturnOccurrences")->name('clients.business.tax-return-occurrences');
        Route::post("/all", "getAll")->name('clients.business.all');
        Route::post("/trash", "trash")->name('clients.business.trash');
        Route::post("/restore", "restore")->name('clients.business.restore');
        Route::post("/trashed", "trashed")->name('clients.business.trashed');
        Route::post("/delete", "delete")->name('clients.business.delete');
        Route::post("/status", "status")->name('clients.business.status');
        Route::post("/{guid}/edit", "edit")->name('clients.business.edit');
        Route::post("/{guid}/view", "view")->name('clients.business.view');
        Route::post("/{guid}/users", "users")->name('clients.business.users');
        Route::post("/{guid}/logo/upload", "uploadLogo")->name('clients.business.logo.upload');
        Route::post("/{guid}/logo/get", "getLogo")->name('clients.business.logo.get');
        Route::post("/{guid}/logo/delete", "deleteLogo")->name('clients.business.logo.delete');
        Route::post("/{guid}/documents", "documents")->name('clients.business.documents');
        Route::get("/count", "getBusinessCount")->name('clients.business.count');
        Route::get("/list", "list")->name('clients.business.list');
        Route::get("/duplicates", "duplicates")->name('clients.business.duplicates');
        Route::post("/duplicates/delete-empty", "deleteEmptyDuplicates")->name('clients.business.duplicates.delete-empty');
        Route::post("/duplicates/merge", "mergeDuplicates")->name('clients.business.duplicates.merge');
    });
    
    Route::controller(Invites::class)->prefix('business')->group(function () {
        Route::post("/{guid}/invites/all", "getAll")->name('clients.business.invites.all');
        Route::post("/{guid}/invites/send", "send")->name('clients.business.invites.send');
        Route::post("/{guid}/invites/delete", "delete")->name('clients.business.invites.delete');
        Route::post("/{guid}/invites/resend", "resend")->name('clients.business.invites.resend');
    });
    
    // Business checklist
    Route::controller(Checklists::class)->prefix('business')->group(function () {
        Route::post("/{guid}/checklist/all", "getAll")->name('clients.business.checklist.all');
        Route::post("/{guid}/checklist/create", "create")->name('clients.business.checklist.create');
        Route::post("/{guid}/checklist/delete", "delete")->name('clients.business.checklist.delete');
        Route::post("/{guid}/checklist/{code}/edit", "edit")->name('clients.business.checklist.edit');
         //Route::get("/{guid}/checklist/{code}/view", "view")->name('clients.business.checklist.view');
        Route::post("/{guid}/checklist/{code}/view", "view")->name('clients.business.checklist.view');
        Route::post("/{guid}/checklist/{code}/documents", "documents")->name('clients.business.checklist.documents');
        Route::post("/{guid}/checklist/subcategories", "subcategories")->name('clients.business.checklist.subcategories');
    });

    // Default checklist
    Route::controller(Checklists::class)->group(function () {
        Route::post("/checklist/all", "getAll")->name('clients.default.checklist.all');
        Route::post("/checklist/create", "create")->name('clients.default.checklist.create');
        Route::post("/checklist/{guid}/{code}/edit", "edit")->name('clients.default.checklist.edit');
        Route::get("/checklist/{guid}/{code}/view", "view")->name('clients.default.checklist.view');
        //Route::get("/checklist/default/{guid}/{code}/view", "view")->name('clients.default.checklist.view');

      

        Route::post("/checklist/delete", "delete")->name('clients.default.checklist.delete');
        Route::post("/checklist/import", "import")->name('clients.default.checklist.import');
    });
    
    Route::controller(Documents::class)->prefix('checklist')->group(function () {
        Route::post("/{guid}/documents/upload", "upload")->name('clients.checklist.documents.upload');
        // Admin/Accountant only — uploads land 'approved' and status-locked.
        // Role gating lives in the controller (bulkUpload), not here, so the
        // 403 shape matches the sibling document endpoints.
        Route::post("/{guid}/documents/bulk-upload", "bulkUpload")->name('clients.checklist.documents.bulk_upload');
        Route::post("/{guid}/documents/delete", "delete")->name('clients.checklist.documents.delete');
        Route::post("/{guid}/documents/get", "get")->name('clients.checklist.documents.get');
        Route::post("/{guid}/documents/comment", "comment")->name('clients.checklist.documents.comment');
        Route::post("/{guid}/documents/status", "status")->name('clients.checklist.documents.status');
        Route::get("/{guid}/documents/download", "download_zip")->name('clients.checklist.documents.download');

       Route::post("/{guid}/documents/reupload", "reupload")->name('clients.checklist.documents.reupload');
        Route::get("/{guid}/documents/total", "getTotalDocuments")->name('clients.checklist.documents.total');
    Route::get("/{guid}/documents/pending", "getPendingDocuments")->name('clients.checklist.documents.pending');
      });
    
    // Firm subcategory codes (box codes + values per firm)
    Route::controller(FirmSubTaxCategoryCode::class)->prefix('business')->group(function () {
        Route::post('/subcategory-codes/save',                              'store')              ->name('clients.business.subcategory.codes.save');
        Route::post('/subcategory-codes/update',                            'update')             ->name('clients.business.subcategory.codes.update');
        Route::post('/subcategory-codes/delete',                            'delete')             ->name('clients.business.subcategory.codes.delete');
        Route::post('/{guid}/subcategory-codes',                            'listSelected')       ->name('clients.business.subcategory.codes.list');
        Route::get('/{firm_id}/checklist-items/{checklist_item_id}/codes',  'listByChecklistItem')->name('clients.business.subcategory.codes.bychecklistitem');
    });

    // Tax filing lifecycle — aggregate CRA code review, start/send/sign/file
    Route::controller(Filings::class)->prefix('business')->group(function () {
        Route::post('/{firm_id}/filing/codes/review', 'reviewCodes')  ->name('clients.business.filing.codes.review');
        Route::post('/{firm_id}/filing/latest',       'latestForFirm')->name('clients.business.filing.latest');
        Route::get('/{guid}/filing/pending-documents',  'pendingDocuments')->name('clients.business.filing.pending_documents.show');
        Route::post('/{guid}/filing/pending-documents', 'pendingDocuments')->name('clients.business.filing.pending_documents');
        Route::post('/filing/start',                  'start')       ->name('clients.business.filing.start');
        Route::post('/filing/{filing_id}/upload-form',   'uploadForm')  ->name('clients.business.filing.upload_form');
        Route::post('/filing/{filing_id}/send-link',     'sendLink')    ->name('clients.business.filing.send_link');
        Route::get('/filing/{filing_id}/link-documents',  'linkDocuments')->name('clients.business.filing.link_documents.show');
        Route::post('/filing/{filing_id}/link-documents', 'linkDocuments')->name('clients.business.filing.link_documents');
        Route::post('/filing/{filing_id}/status',        'status')      ->name('clients.business.filing.status');
        Route::get('/filing/pending-signatures',      'pendingSignatures')->name('clients.business.filing.pending_signatures.show');
        Route::post('/filing/pending-signatures',      'pendingSignatures')->name('clients.business.filing.pending_signatures');
        Route::post('/filing/{filing_id}/upload-signed', 'uploadSigned')->name('clients.business.filing.upload_signed');
        Route::get('/filing/{filing_id}/signed-documents',                        'signedDocuments')     ->name('clients.business.filing.signed_documents.show');
        Route::post('/filing/{filing_id}/signed-documents',                       'signedDocuments')     ->name('clients.business.filing.signed_documents');
        Route::post('/filing/{filing_id}/signed-documents/{document_id}/status',  'updateDocumentStatus')->name('clients.business.filing.document_status');
        Route::post('/filing/{filing_id}/mark-filed',    'markFiled')   ->name('clients.business.filing.mark_filed');
        Route::post('/filing/{filing_id}/upload-cra-document', 'uploadCraDocument')->name('clients.business.filing.upload_cra_document');
        Route::get('/filing/{filing_id}/cra-documents',  'craDocuments')->name('clients.business.filing.cra_documents.show');
        Route::post('/filing/{filing_id}/cra-documents', 'craDocuments')->name('clients.business.filing.cra_documents');
    });

    Route::controller(Payments::class)->prefix('business')->group(function () {
        Route::get('/payments/summary', 'summary')->name('clients.business.payments.summary');
        Route::post('/payments/all', 'getAllFirms')->name('clients.business.payments.all-firms');
        Route::post('/{guid}/payments/create', 'create')->name('clients.business.payments.create');
        Route::post('/{guid}/payments/all', 'getAll')->name('clients.business.payments.all');
        Route::post('/{guid}/payments/{id}/view', 'view')->name('clients.business.payments.view');
        Route::post('/{guid}/payments/{id}/edit', 'edit')->name('clients.business.payments.edit');
    });

    Route::controller(Documents::class)->prefix('business')->group(function () {
        Route::post("/{guid}/agreement/upload", "upload_agreement")->name('clients.business.agreement.upload_agreement');
        Route::post("/{guid}/agreement/edit", "edit_agreement")->name('clients.business.agreement.edit_agreement');
        Route::post("/{guid}/agreement/delete", "delete_agreement")->name('clients.business.agreement.delete_agreement');
        Route::post("/{guid}/agreement/get", "get_agreement")->name('clients.business.agreement.get_agreement');
    });
    
    Route::controller(Documents::class)->group(function () {
        Route::post("/file/update", "updateRecord")->name('clients.documents.update_record');
        Route::get("/file/get/{hash}", "getRecord")->name('clients.documents.get_record');
        Route::post("/documents/recent", "getRecentBusinessDocuments")->name('clients.documents.recent');
    });
});

