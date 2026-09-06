<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Config;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'admin@inovexiasoftware.com'],
            [
                'guid'       => 'ADM1',
                'first_name' => 'Admin',
                'last_name'  => 'User',
                'password'   => Hash::make('Test@1234'),
                'status'     => '1',
            ]
        );
        if (! $user->hasRole('Admin')) {
            $user->assignRole('Admin');
        }

        $user = User::firstOrCreate(
            ['email' => 'asifaziz@inovexiasoftware.com'],
            [
                'guid'       => 'ADM2',
                'first_name' => 'Asif',
                'last_name'  => 'Aziz',
                'password'   => Hash::make('Test@1234'),
                'status'     => '1',
            ]
        );
        if (! $user->hasRole('Accountant')) {
            $user->assignRole('Accountant');
        }

    }
}
