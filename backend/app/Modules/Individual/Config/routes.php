<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Use App\Modules\Individual\Controllers\Category;
use App\Modules\Individual\Controllers\Documents;
use App\Modules\Individual\Controllers\Users;

use App\Modules\Users\Controllers\Invites;
use App\Modules\Individual\Controllers\SubCategory;
use App\Modules\Individual\Controllers\SubTaxCategoryCode;
use App\Modules\Individual\Controllers\Payments;

// Protected routes
Route::middleware(['auth:sanctum'])->group(function () {

    Route::controller(Category::class)->group(function () {

        /*Route::post('/categories/all', 'getAll')->name('individual.categories.all');
        Route::post('/categories/save', 'saveUserCategories')->name('individual.categories.save');
        Route::post('/categories/user', 'getUserCategories')->name('individual.categories.user');*/

        // ✅ LIST
        Route::get('/categories/all', 'getAll')->name('individual.categories.all');

        // ✅ CREATE
        Route::post('/categories/create', 'create')->name('individual.categories.create');

        // ✅ UPDATE
        Route::post('/categories/{id}/edit', 'edit')->name('individual.categories.edit');

        // ✅ DELETE
        Route::post('/categories/delete', 'delete')->name('individual.categories.delete');

        // ✅ USER SAVE
        Route::post('/categories/save', 'saveUserCategories')->name('individual.categories.save');

        // ✅ USER UPDATE
        Route::match(['get', 'post'], '/categories/update', 'updateUserCategories')->name('individual.categories.update');

        // ✅ USER LIST
        Route::post('/categories/getuser', 'getUserCategories')->name('individual.categories.getuser');

        // ✅ USER SELECTED MAIN CATEGORIES
        Route::post('/categories/selected', 'getSelectedUserCategories')->name('individual.categories.selected');

        // ✅ TAXFILER CATEGORY LIST FOR ACCOUNTANT
        Route::post('/categories/taxfiler', 'getTaxfilerCategories')->name('individual.categories.taxfiler');

    });

    Route::controller(Users::class)->group(function () {
        Route::post('/taxfilers', 'listTaxfilers')->name('individual.taxfilers.list');
        Route::get('/count', 'getIndividualCount')->name('individual.count');
    });

    Route::controller(SubTaxCategoryCode::class)->group(function () {
        Route::post('/taxfilers/{user_id}/subcategory-codes/list', 'listSelected')->name('individual.taxfilers.subcategory.codes.selected');
        Route::post('/taxfilers/{user_id}/subcategories/{sub_tax_category_id}/codes/list', 'listSelected')->name('individual.taxfilers.subcategory.codes.bycategory');
    });

    Route::controller(Payments::class)->group(function () {
        Route::post('/taxfilers/payments/all', 'getAllTaxfilers')->name('individual.taxfilers.payments.all-taxfilers');
        Route::post('/taxfilers/{user_id}/payments/create', 'create')->name('individual.taxfilers.payments.create');
        Route::post('/taxfilers/{user_id}/payments/{id}/view', 'view')->name('individual.taxfilers.payments.view');
        Route::post('/taxfilers/{user_id}/payments/{id}/edit', 'edit')->name('individual.taxfilers.payments.edit');
    });

    Route::controller(Documents::class)->group(function () {
    Route::post('/taxfilers/{user_id}/documents', 'listTaxfilerDocuments')->name('individual.taxfilers.documents.list');
    Route::post('/taxfilers/{user_id}/income-tax-return/upload', 'uploadIncomeTaxReturn')->name('individual.taxfilers.income-tax-return.upload');
    Route::post('/taxfilers/{user_id}/subcategories/{sub_tax_category_id}/documents', 'listTaxfilerSubcategoryDocuments')->name('individual.taxfilers.subcategory.documents.list');
    Route::get('/taxfilers/{user_id}/taxcategory/{sub_tax_category_id}/listdocuments', 'listTaxfilerTaxCategoryDocuments')->name('individual.taxfilers.taxcategory.documents.list');
    Route::post('/taxfilers/{user_id}/taxcategory/{sub_tax_category_id}/documents/delete', 'deleteTaxfilerDocument')->name('individual.taxfilers.taxcategory.documents.delete');

    // ✅ Updated ZIP download route
    Route::get('accountant/tax-filer/{userId}/subcategory/{sub_tax_category_id}/year/{year}/download-zip','accountantDownloadSubcategoryDocumentsZip')->name('individual.taxfilers.taxcategory.documents.downloadZip');
    Route::get('/taxfilers/{user_id}/taxcategory/{sub_tax_category_id}/file/{file_id}/download','accountantDownloadSingleDocument')->name('individual.taxfilers.taxcategory.documents.downloadSingle');
    Route::get('accountant/tax-filer/{userId}/year/{year}/download-all-zip', 'accountantDownloadAllSubcategoriesZip')->name('individual.taxfilers.all.subcategories.documents.downloadZip');
    Route::get('accountant/tax-filer/{userId}/category/{tax_category_id}/download-zip', 'accountantDownloadCategoryDocumentsZip')->name('individual.taxfilers.category.documents.downloadZip');
});

    Route::controller(Invites::class)->prefix('business')->group(function () {
       
        Route::post("/invites/send", "send")->name('individual.business.invites.send');
       
    });


     Route::controller(Documents::class)->prefix('taxcategory')->group(function () {
        Route::post("/documents/upload", "upload")->name('individual.taxcategory.documents.upload');
        Route::post("/subcategories/complete", "completeSubCategoryUpload")->name('individual.taxcategory.subcategories.complete');
        Route::get("/documents/download-all", "taxfilerDownloadAllDocumentsZip")->name('individual.taxcategory.documents.download-all');
        Route::get("/{sub_tax_category_id}/listdocuments", "listTaxDocuments")->name('individual.taxcategory.documents.list');
        Route::get("/{sub_tax_category_id}/documents/download", "downloadSubcategoryDocumentsZip")->name('individual.taxcategory.documents.download');
        Route::post("/{sub_tax_category_id}/documents/delete", "delete")->name('individual.taxcategory.documents.delete');
        Route::post("/{sub_tax_category_id}/documents/edit", "edit")->name('individual.taxcategory.documents.edit');
        Route::post("/{sub_tax_category_id}/documents/comment", "comment")->name('individual.taxcategory.documents.comment');
        Route::post("/{sub_tax_category_id}/documents/status", "status")->name('individual.taxcategory.documents.status');
      //  Route::post("/{guid}/documents/delete", "delete")->name('individual.checklist.documents.delete');
       // Route::post("/{guid}/documents/get", "get")->name('individual.checklist.documents.get');
      //  Route::post("/{guid}/documents/comment", "comment")->name('individual.checklist.documents.comment');
      //  Route::post("/{guid}/documents/status", "status")->name('individual.checklist.documents.status');
      //  Route::get("/{guid}/documents/download", "download_zip")->name('individual.checklist.documents.download');

       //Route::post("/{guid}/documents/reupload", "reupload")->name('individual.checklist.documents.reupload');
      });
 
    // Literal routes first — prevents wildcard routes from capturing static segments
    Route::controller(SubTaxCategoryCode::class)->prefix('taxcategory')->group(function () {
        Route::post('/subcategory-codes/save', 'store')->name('individual.subcategory.codes.save');
        Route::post('/subcategory-codes/update', 'update')->name('individual.subcategory.codes.update');
        Route::post('/subcategory-codes/delete', 'delete')->name('individual.subcategory.codes.delete');
        Route::post('/subcategory-codes/list', 'listSelected')->name('individual.subcategory.codes.selected');
        Route::get('/subcategories/{sub_tax_category_id}/codes', 'listBySubCategory')->name('individual.subcategory.codes.list');
        Route::get('/subcategory-codes/my-summary', 'mySummary')->name('individual.subcategory.codes.my-summary');
    });

    Route::controller(SubCategory::class)->group(function () {
        Route::get('/categories/{categoryId}/subcategories', 'getByCategory')->name('individual.subcategories.bycategory');
        Route::get('/taxcategory/{user_tax_category_id}/subcategories', 'getByUserTaxCategory')->name('individual.subcategories.byusertaxcategory');
    });
   
});
