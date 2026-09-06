<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Files\Controllers\Files;

// Stream route — auth is the signed token in the URL, no Bearer needed
Route::get('/{file_id}/stream', [Files::class, 'stream'])
    ->name('files.stream')
    ->middleware('signed');
