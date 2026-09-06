<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Notifications\Controllers\Notifications;

Route::middleware(['auth:sanctum'])->group(function () {

    Route::controller(Notifications::class)->group(function () {
        Route::post('all', 'getAll')->name('notifications.all');
        Route::post('unread-count', 'unreadCount')->name('notifications.unread-count');
        Route::post('read-all', 'markAllAsRead')->name('notifications.read-all');
        Route::post('{id}/read', 'markAsRead')->name('notifications.read');
    });

});
