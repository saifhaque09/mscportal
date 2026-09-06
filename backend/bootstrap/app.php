<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        using: function () {
            Route::middleware('web')->group(base_path('routes/web.php'));
            Route::middleware('api')->group(base_path('routes/api.php'));
            Route::middleware('api')->prefix('users')->group(base_path('app/Modules/Users/Config/routes.php'));
            Route::middleware('api')->prefix('auth')->group(base_path('app/Modules/Auth/Config/routes.php'));
            Route::middleware('api')->prefix('settings')->group(base_path('app/Modules/Settings/Config/routes.php'));
            Route::middleware('api')->prefix('clients')->group(base_path('app/Modules/Clients/Config/routes.php'));
            Route::middleware('api')
    ->prefix('individual')
    ->group(base_path('app/Modules/Individual/Config/routes.php'));
            Route::middleware('api')->prefix('files')->group(base_path('app/Modules/Files/Config/routes.php'));
            Route::middleware('api')->prefix('organizations')->group(base_path('app/Modules/Organizations/Config/routes.php'));
            Route::middleware('api')->prefix('reports')->group(base_path('app/Modules/Reports/Config/routes.php'));
            Route::middleware('api')->prefix('deadlines')->group(base_path('app/Modules/Deadlines/Config/routes.php'));
            Route::middleware('api')->prefix('events')->group(base_path('app/Modules/Events/Config/routes.php'));
            Route::middleware('api')->prefix('activity-logs')->group(base_path('app/Modules/ActivityLogs/Config/routes.php'));
            Route::middleware('api')->prefix('notifications')->group(base_path('app/Modules/Notifications/Config/routes.php'));
            Route::middleware('api')->prefix('locations')->group(base_path('app/Modules/Locations/Config/routes.php'));
            Route::middleware('api')->prefix('payroll')->group(base_path('app/Modules/Payroll/Config/routes.php'));
            Route::middleware('api')->prefix('invoices')->group(base_path('app/Modules/Invoices/Config/routes.php'));
        }
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            \Illuminate\Session\Middleware\StartSession::class,
            \App\Http\Middleware\CheckSessionInactivity::class,
        ]);
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
