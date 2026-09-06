<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

/**
 * Class RolesSeeder
 */

class RolesSeeder extends Seeder
{
    public function run(): void
    {

        $roles = [
            'Admin',
            'Accountant',
            'User',
            'Client',
            'Employee',
            'Taxfiler',
            'Staff',
        ];

        if (empty($roles)) {
            return;
        }

        // create roles and assign created permissions
        foreach ($roles as $role_name) {
            Role::firstOrCreate(
                ['name' => $role_name],
                ['guard_name' => 'web']
            );
        }
    }
}
