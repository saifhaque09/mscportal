<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Modules\Auth\Controllers\Login;
use App\Modules\Auth\Controllers\Passwords;

/**
 * Change password routes
 */
Route::controller(Passwords::class)->prefix('password')->group(function () {
    Route::post('validate_email', [Passwords::class, 'validate_email'])->name('password.validate_email');
    Route::post('validate_mobile', [Passwords::class, 'validate_mobile'])->name('password.validate_mobile');
    Route::post('validate_otp', [Passwords::class, 'validate_otp'])->name('password.validate_otp');
    Route::post('create', [Passwords::class, 'create_password'])->name('password.create');
    Route::post('change', [Passwords::class, 'change_password'])->name('password.change');
    Route::post('send_reset_link', [Passwords::class, 'send_reset_link_email'])->name('password.send_reset_link');
    Route::post('validate-password-link', [Passwords::class, 'validatePasswordLink'])
    ->name('password.validate_change_link');
});

/**
 * Login routes
 */
Route::controller(Login::class)->group(function () {
    Route::post('login', [Login::class, 'login'])->name('login.login');
    Route::post('login/email_otp', [Login::class, 'validate_email'])->name('login.validate_email');
    Route::post('login/mobile_otp', [Login::class, 'validate_mobile'])->name('login.validate_mobile');
    Route::post('login/validate_otp', [Login::class, 'validate_otp'])->name('login.validate_otp');
    Route::post('login/otp', [Login::class, 'login_with_otp'])->name('login.login_with_otp');

    Route::post('logout', [Login::class, 'logout'])->middleware(['auth:sanctum'])->name('auth.login.logout');
    Route::post('logout/other_devices', [Login::class, 'logout_other_devices'])->middleware(['auth:sanctum'])->name('auth.login.logout_other_devices');
    Route::post('get_token', [Login::class, 'getToken'])->middleware(['auth:sanctum'])->name('login.get_token');
});
