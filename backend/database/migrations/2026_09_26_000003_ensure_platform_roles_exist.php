<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Ensure baseline application roles exist even when seeders weren't run. */
    public function up(): void
    {
        $roles = config('permission.table_names.roles', 'roles');
        $now = now();

        DB::table($roles)->insertOrIgnore(array_map(
            fn (string $name) => [
                'name' => $name,
                'guard_name' => 'web',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            ['Admin', 'Accountant', 'User', 'Client', 'Employee', 'Taxfiler', 'Staff']
        ));
    }

    /** Role records are reference data and may already be assigned to users. */
    public function down(): void
    {
        // Intentionally preserve roles on rollback to avoid orphaning assignments.
    }
};
