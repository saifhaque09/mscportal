<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

/**
 * Seeds the platform-wide Spatie permission catalog and assigns permissions
 * to the platform-wide roles (Admin/Accountant/Staff/Employee/Client/Taxfiler/User).
 *
 * Scope note: this is the coarse, account-type-level permission layer (e.g.
 * "can an Accountant approve documents at all"). It is intentionally separate
 * from the per-firm OrganizationRole/OrganizationPermission system, which
 * governs fine-grained, per-firm staff duties (manage_payroll, manage_checklist,
 * etc.) via OrganizationUserAssignment. The two are complementary, not
 * duplicates — do not merge their catalogs.
 *
 * Admin is intentionally not assigned permissions here: it bypasses every
 * check via the Gate::before() hook in AppServiceProvider.
 */
class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $guard = config('auth.defaults.guard');

        $permissions = [
            'users.view', 'users.edit', 'users.delete', 'users.manage-status',
            'roles.view', 'roles.manage', 'roles.assign',
            'invites.view', 'invites.send', 'invites.manage',
            'firms.view', 'firms.manage', 'firms.delete',
            'checklists.view', 'checklists.manage',
            'documents.view', 'documents.upload', 'documents.approve',
            'tax-categories.view', 'tax-categories.manage',
            'tax-documents.view', 'tax-documents.upload', 'tax-documents.approve',
            'settings.view', 'settings.manage',
            'email-templates.manage',
            'organizations.manage', 'organizations.assign',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
        }

        // Role => permission names. Admin is deliberately absent (see class docblock).
        $matrix = [
            'Accountant' => [
                'users.view', 'users.edit', 'users.manage-status', 'users.delete',
                'invites.view', 'invites.send', 'invites.manage',
                'firms.view', 'firms.manage',
                'checklists.view', 'checklists.manage',
                'documents.view', 'documents.upload', 'documents.approve',
                'tax-categories.view', 'tax-categories.manage',
                'tax-documents.view', 'tax-documents.upload', 'tax-documents.approve',
                'organizations.manage', 'organizations.assign',
            ],
            // Treated the same tier as Accountant: existing code consistently
            // groups 'Staff' with 'Accountant' as internal firm staff
            // (see Users::getAll/getTaxfilerCount-style role filters and
            // Invites role lists).
            'Staff' => [
                'users.view', 'users.edit', 'users.manage-status', 'users.delete',
                'invites.view', 'invites.send', 'invites.manage',
                'firms.view', 'firms.manage',
                'checklists.view', 'checklists.manage',
                'documents.view', 'documents.upload', 'documents.approve',
                'tax-categories.view', 'tax-categories.manage',
                'tax-documents.view', 'tax-documents.upload', 'tax-documents.approve',
                'organizations.manage', 'organizations.assign',
            ],
            'Employee' => [
                'firms.view',
                'checklists.view',
                'documents.view', 'documents.upload',
            ],
            'Client' => [
                'firms.view',
                'invites.view',
                'checklists.view',
                'documents.view', 'documents.upload',
            ],
            'Taxfiler' => [
                'tax-documents.view', 'tax-documents.upload',
            ],
            // 'User' role intentionally gets no permissions — legacy/unused.
        ];

        foreach ($matrix as $roleName => $permissionNames) {
            $role = Role::where('name', $roleName)->where('guard_name', $guard)->first();
            if (! $role) {
                continue;
            }
            $role->syncPermissions($permissionNames);
        }
    }
}
