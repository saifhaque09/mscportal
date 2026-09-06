<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Settings Configs
    |--------------------------------------------------------------------------
    |
    */
    'context' => [ 'registration', 'login', 'user' ],
    'registration' => [
        'disable_user_registration' => 1,
        'default_user_role' => 'Client',
        'auto_approve_user' => 0,
        'registration_field_email_show' => 1,
        'registration_field_email_is_required' => 1,
        'registration_field_mobile_show' => 0,
        'registration_field_mobile_is_required' => 0,
    ],
    'login' => [
        'login_field_email_show' => 1,
        'login_field_mobile_show' => 0,
        'login_field_is_required' => 'any',
        'single_device_login_only' => 0,
    ],
    'general' => [
        'theme_color' => '#000000',
        'app_name' => 'MSC Portal',
    ],
];
