<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Deadlines\Controllers\OrganizationDeadlines;

Route::middleware(['auth:sanctum'])->group(function () {

    Route::controller(OrganizationDeadlines::class)->group(function () {
        Route::get('/all',                          'index')          ->name('deadlines.all');
        Route::post('/firms',                       'firms')          ->name('deadlines.firms');
        Route::get('/reminders',                    'reminders')      ->name('deadlines.reminders');
        Route::post('/reminders/{id}/payment',      'updateReminderPayment') ->name('deadlines.reminders.payment');
        Route::post('/reminders/{id}/send',         'sendReminder')   ->name('deadlines.reminders.send');
        Route::post('/calendar',                    'calendar')       ->name('deadlines.calendar');
        Route::post('/generate-all',                'generateAll')    ->name('deadlines.generate-all');
        Route::get('/organizations/{guid}',         'byOrganization') ->name('deadlines.by-organization');
        Route::post('/organizations/{id}/generate', 'generate')       ->name('deadlines.generate');
    });

});
