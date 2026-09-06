<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Organizations\Models\OrganizationPermission;

class OrganizationPermissionSeeder extends Seeder
{
    public function run()
    {
        $permissions = [
            ['name' => 'Manage Business Client',    'code' => 'manage_business_client'],
            ['name' => 'Manage Checklist',          'code' => 'manage_checklist'],
            ['name' => 'Manage Payroll',            'code' => 'manage_payroll'],
            ['name' => 'Manage Deadlines',          'code' => 'manage_deadlines'],
            ['name' => 'Access Business Account',   'code' => 'access_business_account'],
            ['name' => 'Finalise Account',          'code' => 'manage_finalise_account'],
            ['name' => 'Manage Activity Logs',      'code' => 'manage_activity_logs'],
            ['name' => 'Manage Notifications',      'code' => 'manage_notifications'],
            ['name' => 'Manage Messaging',          'code' => 'manage_messaging'],
        ];

        foreach ($permissions as $permission) {
            OrganizationPermission::updateOrCreate(
                ['code' => $permission['code']],
                ['name' => $permission['name'], 'status' => 'active']
            );
        }

        OrganizationPermission::where('code', 'manage_individual_client')->delete();
    }
}
