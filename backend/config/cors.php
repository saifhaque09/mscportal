<?php

// Explicit allowlist instead of '*' — required because supports_credentials is
// true below, and a wildcard origin combined with credentialed requests lets
// any website make authenticated cross-origin calls against this API.
// Override with CORS_ALLOWED_ORIGINS (comma-separated) for other environments.
$allowedOrigins = array_values(array_unique(array_filter(array_map('trim', explode(',', env(
    'CORS_ALLOWED_ORIGINS',
    implode(',', array_filter([env('FRONTEND_URL'), env('FRONTEND_URL_LOCAL')]))
))))));

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['*', 'api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
