<?php

use Illuminate\Support\Facades\Route;

use App\Modules\Payroll\Controllers\Agreements;
use App\Modules\Payroll\Controllers\Employees;
use App\Modules\Payroll\Controllers\Exports;
use App\Modules\Payroll\Controllers\Periods;
use App\Modules\Payroll\Controllers\ReviewItems;
use App\Modules\Payroll\Controllers\Runs;

/*
|--------------------------------------------------------------------------
| Payroll routes  (mounted at /payroll in bootstrap/app.php)
|--------------------------------------------------------------------------
|
| POST for nearly everything, matching the rest of this codebase. GET is used
| only for the two export downloads, which a browser cannot POST cleanly.
|
| Authorization is entirely in the controllers — there is no
| middleware('permission:...') anywhere in this project, and putting it here
| would make the 403 body differ from every sibling endpoint.
|
*/

Route::middleware(['auth:sanctum'])->group(function () {

    /*
    | Cross-firm accountant views. These are the only payroll routes not scoped
    | by {guid}; they scope themselves with BaseController::myAssignedFirmIds().
    */
    Route::controller(Runs::class)->group(function () {
        Route::post('/review/queue', 'queue')->name('payroll.review.queue');
    });

    /*
    | The default agreement template. One template for every client, so these
    | take no {guid} — 'agreements' here is a literal segment, and cannot be
    | mistaken for a firm guid because the scoped routes below are three
    | segments deep where these are two.
    */
    Route::controller(Agreements::class)->prefix('agreements')->group(function () {
        Route::post('/default',        'defaultTemplate')      ->name('payroll.agreements.default');
        Route::post('/default/update', 'updateDefaultTemplate')->name('payroll.agreements.default.update');
    });

    /*
    | Agreements + payroll activation. Activation is the agreement lifecycle,
    | so settings live on this controller rather than a separate one.
    */
    Route::controller(Agreements::class)->prefix('{guid}/agreements')->group(function () {
        Route::post('/settings',           'settings')  ->name('payroll.agreements.settings');
        Route::post('/settings/update',    'activate')  ->name('payroll.agreements.settings.update');
        Route::post('/all',                'getAll')    ->name('payroll.agreements.all');
        Route::post('/create',             'create')    ->name('payroll.agreements.create');
        Route::post('/current',            'current')   ->name('payroll.agreements.current');
        Route::post('/{id}/update',        'update')    ->name('payroll.agreements.update');
        Route::post('/{id}/delete',        'delete')    ->name('payroll.agreements.delete');
        Route::post('/{id}/view',          'view')      ->name('payroll.agreements.view');
        Route::post('/{id}/send',          'send')      ->name('payroll.agreements.send');
        Route::post('/{id}/accept',        'accept')    ->name('payroll.agreements.accept');
        Route::post('/{id}/decline',       'decline')   ->name('payroll.agreements.decline');
        Route::post('/{id}/signed/upload', 'uploadSigned')->name('payroll.agreements.signed.upload');
        Route::post('/{id}/terminate',     'terminate') ->name('payroll.agreements.terminate');
    });

    Route::controller(Employees::class)->prefix('{guid}/employees')->group(function () {
        Route::post('/all',              'getAll')     ->name('payroll.employees.all');
        Route::post('/payroll-summary',  'payrollSummary')->name('payroll.employees.payroll_summary');
        Route::post('/eligible',         'eligible')   ->name('payroll.employees.eligible');
        Route::post('/create',           'create')     ->name('payroll.employees.create');
        Route::post('/{id}/view',        'view')       ->name('payroll.employees.view');
        Route::post('/{id}/edit',        'edit')       ->name('payroll.employees.edit');
        Route::post('/{id}/terminate',   'terminate')  ->name('payroll.employees.terminate');
        Route::post('/{id}/reactivate',  'reactivate') ->name('payroll.employees.reactivate');
        Route::post('/{id}/rates',       'rates')      ->name('payroll.employees.rates');
        Route::post('/{id}/rates/add',   'addRate')    ->name('payroll.employees.rates.add');
    });

    Route::controller(Periods::class)->prefix('{guid}/periods')->group(function () {
        Route::post('/all',        'getAll')   ->name('payroll.periods.all');
        Route::post('/generate',   'generate') ->name('payroll.periods.generate');
        Route::post('/current',    'current')  ->name('payroll.periods.current');
        Route::post('/{id}/view',  'view')     ->name('payroll.periods.view');
        Route::post('/{id}/edit',  'edit')     ->name('payroll.periods.edit');
        Route::post('/{id}/skip',  'skip')     ->name('payroll.periods.skip');
    });

    Route::controller(Runs::class)->prefix('{guid}/runs')->group(function () {
        Route::post('/all',    'getAll')->name('payroll.runs.all');
        Route::post('/start',  'start') ->name('payroll.runs.start');
    });

    /*
    | Run actions are addressed by the run's own guid — the firm is derived
    | from the run, so these do not need the firm segment.
    */
    Route::controller(Runs::class)->prefix('runs/{runGuid}')->group(function () {
        Route::post('/view',            'view')          ->name('payroll.runs.view');
        Route::post('/lines',           'saveLines')     ->name('payroll.runs.lines');
        Route::post('/validate',        'validateRun')   ->name('payroll.runs.validate');
        Route::post('/submit',          'submit')        ->name('payroll.runs.submit');
        Route::post('/start-review',    'startReview')   ->name('payroll.runs.start_review');
        Route::post('/request-changes', 'requestChanges')->name('payroll.runs.request_changes');
        Route::post('/approve',         'approve')       ->name('payroll.runs.approve');
        Route::post('/reopen',          'reopen')        ->name('payroll.runs.reopen');
        Route::post('/cancel',          'cancel')        ->name('payroll.runs.cancel');
        Route::post('/events',          'events')        ->name('payroll.runs.events');
    });

    Route::controller(ReviewItems::class)->prefix('runs/{runGuid}/review-items')->group(function () {
        Route::post('/all',           'getAll')     ->name('payroll.review_items.all');
        Route::post('/create',        'create')     ->name('payroll.review_items.create');
        Route::post('/{id}/respond',  'respond')    ->name('payroll.review_items.respond');
        Route::post('/{id}/resolve',  'resolve')    ->name('payroll.review_items.resolve');
        Route::post('/resolve-all',   'bulkResolve')->name('payroll.review_items.resolve_all');
    });

    Route::controller(Exports::class)->prefix('runs/{runGuid}/export')->group(function () {
        Route::post('/preview', 'preview')->name('payroll.exports.preview');
        Route::get('/csv',      'csv')    ->name('payroll.exports.csv');
        Route::get('/xlsx',     'xlsx')   ->name('payroll.exports.xlsx');
    });
});
