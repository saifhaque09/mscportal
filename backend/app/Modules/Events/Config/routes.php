<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Events\Controllers\Events;

Route::middleware(['auth:sanctum'])->group(function () {

    Route::controller(Events::class)->group(function () {
        Route::post('/all',           'getAll')->name('events.all');
        Route::post('/create',        'create')->name('events.create');
        Route::post('/{guid}/edit',   'edit')->name('events.edit');
        Route::post('/delete',        'delete')->name('events.delete');
    });

});
