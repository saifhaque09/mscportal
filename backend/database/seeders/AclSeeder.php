<?php

namespace Database\Seeders;

use App\Modules\Users\Models\ACL;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class AclSeeder extends Seeder
{
    /**
     * Default sidebar menu per role. Each top-level entry is a section
     * header (no path of its own); its 'children' are the actual
     * clickable items. First-pass defaults mirroring each role's
     * previously-hardcoded sidebar — adjust afterward via the existing
     * acl/add, acl/edit, acl/assign endpoints rather than editing this
     * seeder again.
     */
    private array $menus = [
        // Admin needs everything Accountant has, plus platform-wide org
        // creation and staff/invite management — kept as its own full tree
        // (not an alias of Accountant's, which is now trimmed down).
        'Admin' => [
            ['title' => 'Dashboard', 'icon' => 'LayoutDashboard', 'path' => '/dashboard'],
            ['title' => 'Business Account', 'icon' => 'Home', 'children' => [
                ['title' => 'All Clients', 'icon' => 'Home', 'path' => '/business/clients'],
                ['title' => 'Create Organisation', 'icon' => 'UserPlus', 'path' => '/business/create'],
                ['title' => 'Deadlines', 'icon' => 'Clock', 'path' => '/dashboard/deadlines'],
                ['title' => 'Assign Accountant', 'icon' => 'Calendar', 'path' => '/business/accountants'],
                ['title' => 'Payroll', 'icon' => 'Wallet', 'path' => '/payroll'],
                ['title' => 'Payments', 'icon' => 'CreditCard', 'path' => '/business/payments'],
                ['title' => 'Invoices', 'icon' => 'FileText', 'path' => '/business/invoices'],
            ]],
            ['title' => 'Individual Tax Filers', 'icon' => 'BookText', 'children' => [
                ['title' => 'All Clients', 'icon' => 'Home', 'path' => '/individual/clients'],
                ['title' => 'Create Client', 'icon' => 'UserPlus', 'path' => '/individual/clients/invite'],
                ['title' => 'Assign Accountant', 'icon' => 'Calendar', 'path' => '/individual/accountants'],
                ['title' => 'Payments', 'icon' => 'CreditCard', 'path' => '/individual/payments'],
            ]],
            ['title' => 'Users', 'icon' => 'Users', 'children' => [
                ['title' => 'Users', 'icon' => 'Users', 'path' => '/accountantuser'],
                ['title' => 'Add Users', 'icon' => 'Mail', 'path' => '/invitations'],
                ['title' => 'Permissions', 'icon' => 'Check', 'path' => '/roles-and-permissions'],
            ]],
            ['title' => 'Communications', 'icon' => 'Calendar', 'children' => [
                ['title' => 'Calendar', 'icon' => 'CalendarDays', 'path' => '/dashboard/calendar'],
            ]],
            ['title' => 'Settings & Profile', 'icon' => 'Settings', 'children' => [
                ['title' => 'Settings', 'icon' => 'Settings', 'path' => '/settings'],
                ['title' => 'Profile', 'icon' => 'User', 'path' => '/profile'],
                ['title' => 'Activity Logs', 'icon' => 'History', 'path' => '/activity-logs'],
            ]],
        ],

        // Accountants are firm-scoped: they only manage organizations they're
        // assigned to (see organization_user_assignments), created by Admin.
        // No Create Organisation item, and no platform-wide Users section —
        // that's Admin-only staff/invite management, not a per-firm concern.
        'Accountant' => [
            ['title' => 'Dashboard', 'icon' => 'LayoutDashboard', 'path' => '/dashboard'],
            ['title' => 'Business Account', 'icon' => 'Home', 'children' => [
                ['title' => 'All Clients', 'icon' => 'Home', 'path' => '/business/clients'],
                ['title' => 'Deadlines', 'icon' => 'Clock', 'path' => '/dashboard/deadlines'],
                ['title' => 'Default Checklist', 'icon' => 'ListChecks', 'path' => '/defaultchecklist'],
                ['title' => 'Payroll', 'icon' => 'Wallet', 'path' => '/payroll'],
                ['title' => 'Payments', 'icon' => 'CreditCard', 'path' => '/business/payments'],
                ['title' => 'Invoices', 'icon' => 'FileText', 'path' => '/business/invoices'],
            ]],
            ['title' => 'Individual Tax Filers', 'icon' => 'BookText', 'children' => [
                ['title' => 'All Clients', 'icon' => 'Home', 'path' => '/individual/clients'],
                ['title' => 'Create Client', 'icon' => 'UserPlus', 'path' => '/individual/clients/invite'],
                ['title' => 'Payments', 'icon' => 'CreditCard', 'path' => '/individual/payments'],
            ]],
            ['title' => 'Communications', 'icon' => 'Calendar', 'children' => [
                //['title' => 'Scheduler', 'icon' => 'Calendar', 'path' => '/accountant-assign'],
                //['title' => 'Permissions', 'icon' => 'Check', 'path' => '/roles-and-permissions'],
                ['title' => 'Calendar', 'icon' => 'CalendarDays', 'path' => '/dashboard/calendar'],
            ]],
            ['title' => 'Settings & Profile', 'icon' => 'Settings', 'children' => [
                ['title' => 'Settings', 'icon' => 'Settings', 'path' => '/settings'],
                ['title' => 'Profile', 'icon' => 'User', 'path' => '/profile'],
                ['title' => 'Activity Logs', 'icon' => 'History', 'path' => '/activity-logs'],
            ]],
        ],

        'Client' => [
            ['title' => 'Dashboard', 'icon' => 'Home', 'path' => '/business/board'],
            ['title' => 'My Account', 'icon' => 'Home', 'children' => [
                ['title' => 'Documents', 'icon' => 'BookText', 'path' => '/mydocuments'],
                ['title' => 'Filing', 'icon' => 'FileCheck', 'path' => '/mydocuments/filing'],
                ['title' => 'Deadlines', 'icon' => 'Clock', 'path' => '/dashboard/deadlines'],
                // The Client is the primary actor in payroll — they maintain the
                // employee master and enter every pay period — so this is not an
                // optional extra for the role.
                ['title' => 'Payroll', 'icon' => 'Wallet', 'path' => '/business/payroll'],
                ['title' => 'Invoices', 'icon' => 'FileText', 'path' => '/business/invoices'],
            ]],
            ['title' => 'Settings & Profile', 'icon' => 'Settings', 'children' => [
                ['title' => 'Settings', 'icon' => 'Settings', 'path' => '/settings'],
                ['title' => 'Profile', 'icon' => 'User', 'path' => '/profile'],
                ['title' => 'Users', 'icon' => 'User2', 'path' => '/business/users'],
                ['title' => 'Activity Logs', 'icon' => 'History', 'path' => '/activity-logs'],
            ]],
        ],

        // Firm-scoped staff, not a user manager — same as Client minus Users.
        'Employee' => [
            ['title' => 'Dashboard', 'icon' => 'Home', 'path' => '/business/board'],
            ['title' => 'My Account', 'icon' => 'Home', 'children' => [
                ['title' => 'Documents', 'icon' => 'BookText', 'path' => '/mydocuments'],
                // Read-only: an employee sees their own pay periods and, once
                // the payslip phase lands, their own payslips and T4s.
                ['title' => 'My Pay', 'icon' => 'Wallet', 'path' => '/mypayroll'],
            ]],
            ['title' => 'Settings & Profile', 'icon' => 'Settings', 'children' => [
                ['title' => 'Settings', 'icon' => 'Settings', 'path' => '/settings'],
                ['title' => 'Profile', 'icon' => 'User', 'path' => '/profile'],
                ['title' => 'Activity Logs', 'icon' => 'History', 'path' => '/activity-logs'],
            ]],
        ],

        // Trimmed Accountant menu — no Create Organisation (Admin/Accountant-
        // gated on the backend), no Users/Communications section.
        'Staff' => [
            ['title' => 'Dashboard', 'icon' => 'LayoutDashboard', 'path' => '/dashboard'],
            ['title' => 'Business Account', 'icon' => 'Home', 'children' => [
                ['title' => 'All Clients', 'icon' => 'Home', 'path' => '/business/clients'],
                ['title' => 'Deadlines', 'icon' => 'Clock', 'path' => '/dashboard/deadlines'],
            ]],
            ['title' => 'Individual Tax Filers', 'icon' => 'BookText', 'children' => [
                ['title' => 'All Clients', 'icon' => 'Home', 'path' => '/individual/clients'],
            ]],
            ['title' => 'Settings & Profile', 'icon' => 'Settings', 'children' => [
                ['title' => 'Settings', 'icon' => 'Settings', 'path' => '/settings'],
                ['title' => 'Profile', 'icon' => 'User', 'path' => '/profile'],
                ['title' => 'Activity Logs', 'icon' => 'History', 'path' => '/activity-logs'],
            ]],
        ],
    ];

    public function run(): void
    {
        foreach ($this->menus as $roleName => $sections) {
            $role = Role::where('name', $roleName)->first();
            if (! $role) {
                continue;
            }

            $order = 1;
            foreach ($sections as $section) {
                $parent = $this->upsert($role->id, $section, null, $order++);

                $childOrder = 1;
                foreach ($section['children'] ?? [] as $child) {
                    $this->upsert($role->id, $child, $parent->id, $childOrder++);
                }
            }
        }

        // Accountant's menu previously included Create Organisation and a
        // Users (Staff/Invites) section, seeded by an earlier run of this
        // seeder. Those items were removed above but updateOrCreate() never
        // deletes rows that fall out of $menus, so prune them explicitly.
        $accountantRole = Role::where('name', 'Accountant')->first();
        if ($accountantRole) {
            ACL::where('role_id', $accountantRole->id)
                ->whereIn('path', ['/createorganisation', '#users', '/accountantuser', '/invitations'])
                ->delete();
        }

        // Individual/taxfiler routes moved under /individual/* — see
        // src/config/routes.js and next.config.mjs redirects on the
        // frontend. Prune the pre-move paths across every role the same way.
        ACL::whereIn('path', [
            '/dashboard/individualclient',
            '/dashboard/individualclient/invite',
            '/individual-accountant-assign',
            '/individualaccountant/payments',
        ])->delete();

        // Business routes (/clientmanagement/*, /dashboard/businessclient,
        // /createorganisation, /accountant-assign) moved under /business/*
        // — same reason, same cleanup.
        ACL::whereIn('path', [
            '/dashboard/businessclient',
            '/createorganisation',
            '/accountant-assign',
            '/clientmanagement/payments',
            '/clientmanagement/clientboard',
            '/clientmanagement/user',
        ])->delete();
    }

    private function upsert(int $roleId, array $item, ?int $parentId, int $order): ACL
    {
        return ACL::updateOrCreate(
            [
                'role_id'  => $roleId,
                'group'    => 'web',
                'path'     => $item['path'] ?? '#' . Str::slug($item['title']),
                'category' => 'acl',
            ],
            [
                'title'      => $item['title'],
                'icon'       => $item['icon'],
                'parent_id'  => $parentId,
                'menu_order' => $order,
                'status'     => 1,
            ]
        );
    }
}
