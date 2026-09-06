<?php

use Illuminate\Support\Facades\Route;
use App\Modules\ActivityLogs\Controllers\ActivityLogs;

Route::middleware(['auth:sanctum'])->group(function () {

    Route::controller(ActivityLogs::class)->group(function () {
        Route::post('all', 'getAll')->name('activity-logs.all');
    });

    Route::middleware(['role:Admin'])->group(function () {
        Route::post('admin/all', [ActivityLogs::class, 'getAllForAdmin'])->name('activity-logs.admin.all');
    });

});
