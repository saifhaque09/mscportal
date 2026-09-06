<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE user_status_sub_tax_categories
            MODIFY status ENUM('pending', 'in_progress', 'completed', 'locked', 'unlocked')
            NOT NULL DEFAULT 'unlocked'
        ");

        DB::table('user_status_sub_tax_categories')
            ->whereIn('status', ['pending', 'in_progress'])
            ->update(['status' => 'unlocked']);

        DB::table('user_status_sub_tax_categories')
            ->where('status', 'completed')
            ->update(['status' => 'locked']);

        DB::statement("
            ALTER TABLE user_status_sub_tax_categories
            MODIFY status ENUM('locked', 'unlocked')
            NOT NULL DEFAULT 'unlocked'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE user_status_sub_tax_categories
            MODIFY status ENUM('pending', 'in_progress', 'completed', 'locked', 'unlocked')
            NOT NULL DEFAULT 'pending'
        ");

        DB::table('user_status_sub_tax_categories')
            ->where('status', 'unlocked')
            ->update(['status' => 'pending']);

        DB::statement("
            ALTER TABLE user_status_sub_tax_categories
            MODIFY status ENUM('pending', 'in_progress', 'completed', 'locked')
            NOT NULL DEFAULT 'pending'
        ");
    }
};
