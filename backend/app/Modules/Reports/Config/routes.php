<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Reports\Controllers\ProfitLoss;
use App\Modules\Reports\Controllers\BalanceSheet;
use App\Modules\Reports\Controllers\CombinedReports;

Route::middleware(['auth:sanctum'])->group(function () {

    Route::controller(ProfitLoss::class)->prefix('profit-loss')->group(function () {
        Route::post('upload',                  'upload')                 ->name('reports.profit-loss.upload');
        Route::post('upload-pdf',              'uploadPdf')              ->name('reports.profit-loss.upload-pdf');
        Route::post('file-url',                'fileUrl')                ->name('reports.profit-loss.file-url');
        Route::post('net-income-chart',        'netIncomeChart')          ->name('reports.profit-loss.net-income-chart');
        Route::post('net-income-trend',        'netIncomeTrend')          ->name('reports.profit-loss.net-income-trend');
        Route::post('net-expenses-trend',      'netExpensesTrend')        ->name('reports.profit-loss.net-expenses-trend');
        Route::post('preview',                 'previewProfitLoss')       ->name('reports.profit-loss.preview');
        Route::post('expenses-by-category',    'expensesByCategoryChart') ->name('reports.profit-loss.expenses-by-category');
    });

});

Route::controller(ProfitLoss::class)->prefix('profit-loss')->group(function () {
    Route::get('sample-csv', 'sampleCsv')->name('reports.profit-loss.sample-csv');
});

Route::middleware(['auth:sanctum'])->group(function () {

    Route::controller(BalanceSheet::class)->prefix('balance-sheet')->group(function () {
        Route::post('upload',     'upload')    ->name('reports.balance-sheet.upload');
        Route::post('upload-pdf', 'uploadPdf') ->name('reports.balance-sheet.upload-pdf');
        Route::post('preview',    'preview')   ->name('reports.balance-sheet.preview');
        Route::post('file-url',   'fileUrl')   ->name('reports.balance-sheet.file-url');
    });

});

Route::controller(BalanceSheet::class)->prefix('balance-sheet')->group(function () {
    Route::get('sample-csv',   'sampleCsv')   ->name('reports.balance-sheet.sample-csv');
    Route::get('sample-excel', 'sampleExcel') ->name('reports.balance-sheet.sample-excel');
});

Route::middleware(['auth:sanctum'])->group(function () {

    Route::controller(CombinedReports::class)->prefix('combined')->group(function () {
        Route::post('upload', 'upload')->name('reports.combined.upload');
    });

});

Route::controller(CombinedReports::class)->prefix('combined')->group(function () {
    Route::get('sample-csv', 'sampleCsv')->name('reports.combined.sample-csv');
});
