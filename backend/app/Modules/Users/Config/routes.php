<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Modules\Clients\Controllers\Users as ClientUsers;

use App\Modules\Users\Controllers\Users;
use App\Modules\Users\Controllers\Roles;
use App\Modules\Users\Controllers\Invites;
use App\Modules\Users\Controllers\Userpics;

// Protected routes
Route::middleware(['auth:sanctum'])->group(function () {

    Route::controller(Users::class)->group(function () {
        Route::post("all", "getAll")->name('users.all')->middleware('permission:users.view');
        Route::post("list-all", "listAll")->name('users.list-all')->middleware('permission:users.view');
        // getOne/edit are self-service-or-permission — checked inside the
        // controller since the same route serves "view/edit my own profile"
        // and "view/edit another user's profile" depending on the guid.
        Route::post("{guid}/view", "getOne")->name('users.view');
        Route::post("{guid}/edit", "edit")->name('users.edit');
        Route::post("{guid}/password", "password")->name('users.password');
        // delete/status are self-or-firm-owner-or-permission — same pattern
        // as edit/getOne above, checked inside the controller so a Client
        // can manage their own firm's Client/Employee users without also
        // being handed the platform-wide users.delete/users.manage-status
        // permission.
        Route::post("delete", "delete")->name('users.delete');
        Route::post("status", "status")->name('users.status');
        Route::post("taxfiler/count", "getTaxfilerCount")->name('users.taxfiler.count');
        Route::post("staff/count", "getStaffCount")->name('users.staff.count');
        Route::post("recent", "getRecent")->name('users.recent')->middleware('permission:users.view');
        Route::post("individual-status/toggle", "toggleIndividualStatus")->name('users.individual-status.toggle')->middleware('permission:users.manage-status');
        Route::post("staff/list", "getStaffWithStatus")->name('users.staff.list')->middleware('permission:users.view');
    });

    // roles.view/roles.manage/roles.assign — see database/seeders/PermissionSeeder.php.
    // addUsers (role assignment) is the endpoint that previously let any
    // authenticated user grant themselves Admin; it is now the most tightly
    // gated route in this file.
    Route::controller(Roles::class)->prefix('roles')->group(function () {
        Route::post("/list", "getAll")->name('users.roles.list')->middleware('permission:roles.view');
        Route::post("/create", "store")->name('users.roles.create')->middleware('permission:roles.manage');
        Route::post("/{id}/view", "getOne")->name('users.roles.view')->middleware('permission:roles.view');
        Route::post("/{id}/edit", "store")->name('users.roles.edit')->middleware('permission:roles.manage');
        Route::post("/{id}/delete", "delete")->name('users.roles.delete')->middleware('permission:roles.manage');

        Route::post("/{id}/addUsers", "addUsers")->name('users.roles.addUsers')->middleware('permission:roles.assign');
    });

    Route::controller(Invites::class)->prefix('invites')->group(function () {
        Route::post("all", "getAll")->name('users.invites.all')->middleware('permission:invites.view');
        Route::post("send", "send")->name('users.invites.send')->middleware('permission:invites.send');
        Route::post("delete", "delete")->name('users.invites.delete')->middleware('permission:invites.manage');
        Route::post("resend", "resend")->name('users.invites.resend')->middleware('permission:invites.manage');
        Route::post("count", "getCount")->name('users.invites.count')->middleware('permission:invites.view');
    });

    Route::controller(Userpics::class)->prefix('profile-image')->group(function () {
        Route::post("upload", "upload")->name('users.profile-image.upload');
        Route::post("get", "get")->name('users.profile-image.get');
        Route::post("remove", "remove")->name('users.profile-image.remove');
    });

    Route::controller(Users::class)->prefix('business')->group(function () {
        // Not permission-gated at the route — Users::getAll() already
        // authorizes internally via authorizeFirmScope() (Accountant/Staff
        // with users.view + an access_business_account org assignment, OR
        // the firm's own Client/Employee via firm_id ownership). A blanket
        // permission:users.view gate here would block Client/Employee from
        // ever seeing their own firm's roster, even though they're allowed
        // to invite people onto it (clients.business.invites.send has the
        // same self-service shape, same reasoning).
        Route::post("{guid}/all", "getAll")->name('clients.users.business.all');
    });

    
});

Route::controller(Invites::class)->prefix('invites')->group(function () {
    Route::post("get", "details")->name('users.invites.details');
});

