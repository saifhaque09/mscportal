<?php
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Modules\Invoices\Controllers\Invoices;
use App\Modules\Invoices\Controllers\IndividualInvoices;
use App\Modules\Invoices\Models\IndividualInvoice;
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/', [Invoices::class, 'index']);
    Route::post('/', [Invoices::class, 'store']);
    Route::post('/{invoice}/payment', [Invoices::class, 'payment']);
    Route::patch('/{invoice}/status', [Invoices::class, 'status']);
    Route::get('/{invoice}/pdf', [Invoices::class, 'download']);
    Route::get('/{invoice}/receipt', [Invoices::class, 'receipt']);
});

Route::middleware(['auth:sanctum'])->prefix('individual-invoices')->group(function () {
    Route::get('/', [IndividualInvoices::class, 'index']);
    Route::post('/', [IndividualInvoices::class, 'store']);
    Route::post('/{invoice}/payment', [IndividualInvoices::class, 'payment']);
    Route::patch('/{invoice}/status', [IndividualInvoices::class, 'status']);
    Route::get('/{invoice}/pdf', [IndividualInvoices::class, 'pdf']);
    Route::get('/{invoice}/receipt', fn(Request $r, $invoice) => app(IndividualInvoices::class)->pdf($r, IndividualInvoice::findOrFail($invoice), true));
});
