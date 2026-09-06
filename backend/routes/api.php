<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\LocationsController;

Route::get('/users/this', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware(['auth:sanctum'])->prefix('locations')->group(function () {
    Route::get('countries', [LocationsController::class, 'countries'])->name('locations.countries');
    Route::get('countries/{code}/provinces', [LocationsController::class, 'provinces'])->name('locations.provinces');
});

/**
 * ACL / role administration — Admin only.
 * Previously registered with no auth middleware at all.
 */
Route::middleware(['auth:sanctum', 'role:Admin'])->group(function () {
    Route::post('acl/add', [PublicController::class, 'createACL'])->name('public.acl.add');
    Route::post('acl/edit/{id}', [PublicController::class, 'editACL'])->name('public.acl.edit');
    Route::post('acl/delete/{id}', [PublicController::class, 'deleteACL'])->name('public.acl.delete');
    Route::post('acl/get/{role}', [PublicController::class, 'getACL'])->name('public.acl.getrole');
    Route::post('acl/assign/{id}', [PublicController::class, 'assignACL'])->name('public.acl.assign');
    
    Route::post('setRoles', [PublicController::class, 'assignRolesToUsersWithoutRoles'])->name('public.acl.setRoles');
});

Route::post('acl/get', [PublicController::class, 'getACL'])->name('public.acl.get');