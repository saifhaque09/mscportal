<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Organizations\Models\OrganizationRole;

class OrganizationRoleSeeder extends Seeder
{
    public function run()
    {
        $roles = [
            ['name' => 'Lead Accountant', 'code' => 'lead_acc'],
            ['name' => 'Senior',          'code' => 'senior'],
            ['name' => 'Dataloader',      'code' => 'dataloader'],
        ];

        foreach ($roles as $role) {
            OrganizationRole::updateOrCreate(
                ['code' => $role['code']],
                ['name' => $role['name'], 'status' => 'active']
            );
        }

        OrganizationRole::where('code', 'junior')->delete();
    }
}
