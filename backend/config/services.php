<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Mailgun
    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT'),
        'scheme' => 'https',
    ],

    // Google OAuth
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID', "526756025078-gi4bs9qgeq0glpcc46rtjbqfc38bo3j3.apps.googleusercontent.com"),
        'client_secret' => env('GOOGLE_CLIENT_SECRET', "GOCSPX-5Z6W5Z6W5Z6W5Z6W5Z6W5Z6W5"),
        'redirect' => env('GOOGLE_REDIRECT_URI', env('FRONTEND_URL').'auth/callback'),
    ],

    // Message Central SMS API KEY
    'mc' => [
        'customer_id' => env('MCSMS_CUSTOMER_ID'),
        'customer_key' => env('MCSMS_CUSTOMER_KEY'),
        'base_url' => env('MCSMS_BASE_URL'),
    ],

    // Google Gemini AI API KEY
    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
        'base_url' => env('GEMINI_API_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/models/'),
        'model' => env('GEMINI_API_MODEL', 'gemini-2.5-flash'),
    ],

];
