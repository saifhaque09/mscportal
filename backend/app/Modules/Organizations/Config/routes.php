<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Organizations\Controllers\Firms;
use App\Modules\Organizations\Controllers\Taxfilers;

Route::middleware(['auth:sanctum'])->group(function () {

    // organizations.manage: define/edit/delete org roles and view the
    // permission catalog. organizations.assign: assign/change/remove which
    // org role a user holds on a specific firm. See PermissionSeeder.
    Route::controller(Firms::class)->prefix('roles')->middleware('permission:organizations.manage')->group(function () {
        Route::post('/all', 'getRoles')->name('organizations.roles.all');
        Route::post('/create', 'createRole')->name('organizations.roles.create');
        Route::post('/{id}/edit', 'editRole')->name('organizations.roles.edit');
        Route::post('/{id}/delete', 'deleteRole')->name('organizations.roles.delete');
    });

    Route::controller(Firms::class)->prefix('permissions')->middleware('permission:organizations.manage')->group(function () {
        Route::post('/all', 'getPermissions')->name('organizations.permissions.all');
    });

    Route::controller(Firms::class)->prefix('firms')->group(function () {
        Route::post('/all', 'getAll')->name('organizations.firms.all')->middleware('permission:organizations.manage');
        // Self-scoped (auth()->user() only) — intentionally not gated behind
        // organizations.manage, or a user without that permission could never
        // check their own assignments.
        Route::post('/my/permissions', 'getMyPermissions')->name('organizations.firms.my.permissions');
        Route::post('/users/{guid}/permissions', 'getUserPermissions')->name('organizations.firms.users.permissions')->middleware('permission:organizations.manage');
        // Read-only — not gated behind organizations.manage at the route
        // level, since a firm's own Client/Employee also need to see who's
        // assigned to their account (e.g. the "Accountant Assigned" card on
        // their dashboard). getMembers() authorizes internally via
        // authorizeFirmScope() instead.
        Route::post('/{guid}/members', 'getMembers')->name('organizations.firms.members');
        Route::post('/{guid}/members/lead-accountant', 'getLeadAccountants')->name('organizations.firms.members.lead-accountant')->middleware('permission:organizations.manage');
        Route::post('/{guid}/members/assign', 'assignRole')->name('organizations.firms.members.assign')->middleware('permission:organizations.assign');
        Route::post('/{guid}/members/update-role', 'updateRole')->name('organizations.firms.members.update-role')->middleware('permission:organizations.assign');
        Route::post('/{guid}/members/remove', 'removeRole')->name('organizations.firms.members.remove')->middleware('permission:organizations.assign');
    });

    Route::controller(Taxfilers::class)->prefix('taxfilers')->group(function () {
        // Self-scoped (auth()->user() only) — same reasoning as
        // firms/my/permissions: a taxfiler must be able to see who's
        // handling their own account without holding organizations.manage.
        Route::get('/my/team', 'myTeam')->name('organizations.taxfilers.my.team');
        Route::post('/{guid}/members', 'getMembers')->name('organizations.taxfilers.members')->middleware('permission:organizations.manage');
        Route::post('/{guid}/members/assign', 'assignRole')->name('organizations.taxfilers.members.assign')->middleware('permission:organizations.assign');
        Route::post('/{guid}/members/update-role', 'updateRole')->name('organizations.taxfilers.members.update-role')->middleware('permission:organizations.assign');
        Route::post('/{guid}/members/remove', 'removeRole')->name('organizations.taxfilers.members.remove')->middleware('permission:organizations.assign');
    });

});
