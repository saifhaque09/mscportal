<?php
use Illuminate\Support\Facades\Route;
use App\Modules\Chat\Controllers\ChatController;
Route::middleware('auth:sanctum')->group(function(){Route::get('inbox',[ChatController::class,'inbox']);Route::get('contacts',[ChatController::class,'contacts']);Route::post('conversations',[ChatController::class,'create']);Route::get('conversations/{id}',[ChatController::class,'show']);Route::post('conversations/{id}/messages',[ChatController::class,'message']);});
