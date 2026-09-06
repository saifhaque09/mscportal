<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Locations\Controllers\Locations;

Route::middleware(['auth:sanctum'])->group(function () {

    Route::controller(Locations::class)->group(function () {
        Route::get('countries', 'getCountries')->name('locations.countries');
        Route::get('countries/{code}/provinces', 'getProvinces')->name('locations.countries.provinces');
    });

});
