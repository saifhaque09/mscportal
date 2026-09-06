<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Settings\Models\Setting;

/**
 * Class RolesSeeder
 */

class SettingsSeeder extends Seeder
{
    public function run(): void
    {

        /*
        |--------------------------------------------------------------------------
        | Settings Configs
        |--------------------------------------------------------------------------
        |
        */
        $settings = [
            'login' => [
                'login_field_email_show' => 1,
                'login_field_mobile_show' => 0,
                'login_field_is_required' => 'any',
                'single_device_login_only' => 0,
            ],
            'user' => [
            ],
            'general' => [
                'theme_color' => '#000000',
                'app_name' => 'MSC Portal',
            ],
        ];

        if (! empty ($settings)) {
            foreach ($settings as $context=>$setting) {
                if (empty ($setting) || ! is_array ($setting)) {
                    continue;
                }
                foreach ($setting as $key=>$val) {
                    $data = [];
                    $data['key'] = $key;
                    $data['value'] = $val;
                    $data['context'] = $context;
                    $settings = Setting::upsert($data, ['context', 'key'], ['value']);
                }
            }
        }
    }
}
