<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Organizations\Models\OrganizationRole;
use App\Modules\Organizations\Models\OrganizationPermission;
use App\Modules\Organizations\Models\OrganizationRolePermission;

class OrganizationRolePermissionSeeder extends Seeder
{
    public function run()
    {
        $allPermissions = OrganizationPermission::pluck('id', 'code');

        $matrix = [
            'lead_acc'   => $allPermissions->keys()->all(),
            'senior'     => ['access_business_account', 'manage_finalise_account', 'manage_deadlines', 'manage_payroll'],
            'dataloader' => ['access_business_account'],
        ];

        foreach ($matrix as $roleCode => $permissionCodes) {
            $role = OrganizationRole::where('code', $roleCode)->first();
            if (! $role) continue;

            foreach ($permissionCodes as $permCode) {
                $permissionId = $allPermissions->get($permCode);
                if (! $permissionId) continue;

                OrganizationRolePermission::updateOrCreate(
                    ['organization_role_id' => $role->id, 'permission_id' => $permissionId]
                );
            }
        }
    }
}
