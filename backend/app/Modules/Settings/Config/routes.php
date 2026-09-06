<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Modules\Users\Models\Role;

use App\Modules\Settings\Controllers\Settings;
use App\Modules\Settings\Controllers\Templates;
use App\Modules\Files\Controllers\Files;

Route::middleware(['auth:sanctum'])->group(function () {

    Route::controller(Settings::class)->group(function () {
        Route::post("/{context}", "saveSettings")->name('settings.save');
    });

    Route::controller(Settings::class)->group(function () {
        Route::post("/{context}/save", "saveSettings")->name('settings.app.save');
        Route::post("/{context}/file/upload", "uploadFile")->name('settings.app.file.upload');
        Route::post("/{context}/file/delete", "deleteFile")->name('settings.app.setting.delete');
          Route::post("/file/delete", "deleteFile")->name('settings.app.file.delete');
    });        

    Route::controller(Templates::class)->middleware('permission:email-templates.manage')->group(function () {
        Route::get("email_templates/all", "getAllTemplates")->name('settings.email.template.all');
        Route::get("email_templates/{id}/get", "getOneTemplate")->name('settings.email.template.get');
        Route::post("email_templates/{id}/save", "saveTemplate")->name('settings.email.template.save');
    });

});
            
Route::controller(Settings::class)->group(function () {
    Route::post("/{context}/file/get", "getFile")->name('settings.app.file.get');
    Route::get("/{context}", "getSettings")->name('settings.get');
});
