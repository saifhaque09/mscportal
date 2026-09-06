<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Gate;
use App\Modules\Clients\Models\Firm;
use App\Observers\FirmObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Users
        app('config')->set('users', require app_path('Modules/Users/Config/config.php'));
        //app('config')->set('roles', require app_path('Modules/Users/Config/roles.php'));
        //app('config')->set('permissions', require app_path('Modules/Users/Config/permissions.php'));
        //app('config')->set('acl', require app_path('Modules/Users/Config/acl.php'));

        // Settings
        app('config')->set('settings', require app_path('Modules/Settings/Config/config.php'));

        // Clients
        app('config')->set('clients', require app_path('Modules/Clients/Config/config.php'));

        // Files
        app('config')->set('files', require app_path('Modules/Files/Config/config.php'));

        // Organizations
        app('config')->set('organizations', require app_path('Modules/Organizations/Config/config.php'));

        // Reports
        app('config')->set('reports', require app_path('Modules/Reports/Config/config.php'));

        // Deadlines
        app('config')->set('deadlines', require app_path('Modules/Deadlines/Config/config.php'));

        // Events
        app('config')->set('events', require app_path('Modules/Events/Config/config.php'));

        // Activity Logs
        app('config')->set('activity-logs', require app_path('Modules/ActivityLogs/Config/config.php'));

        // Notifications
        app('config')->set('notifications', require app_path('Modules/Notifications/Config/config.php'));

        // Payroll
        app('config')->set('payroll', require app_path('Modules/Payroll/Config/config.php'));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Firm::observe(FirmObserver::class);

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/changepassword?token={$token}&email={$notifiable->getEmailForPasswordReset()}";
        });

        // Admin bypasses every permission/role check — avoids having to keep an
        // explicit "Admin has all permissions" assignment in sync with the
        // permission catalog as it grows.
        Gate::before(function ($user, string $ability) {
            return $user->hasRole('Admin') ? true : null;
        });
    }
}
