<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolesSeeder::class,
            PermissionSeeder::class,
            UserSeeder::class,
            SettingsSeeder::class,

            // Individual tax categories — must run before mapping
            TaxCategorySeeder::class,
            SubTaxCategorySeeder::class,
            CategorySubcategoryMappingSeeder::class,

            // Organization roles/permissions — must run before mapping
            OrganizationRoleSeeder::class,
            OrganizationPermissionSeeder::class,
            OrganizationRolePermissionSeeder::class,

            // Standalone seeders
            AclSeeder::class,
            DeadlineSeeder::class,
            ProfitLossCategorySeeder::class,
            BalanceSheetCategorySeeder::class,
            InvoiceSampleSeeder::class,
            IndividualInvoiceSampleSeeder::class,
        ]);
    }
}
