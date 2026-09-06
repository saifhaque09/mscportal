<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ✅ 1. Add year column if missing
        if (!Schema::hasColumn('user_tax_categories', 'year')) {
            Schema::table('user_tax_categories', function (Blueprint $table) {
                $table->year('year')->nullable()->after('tax_category_id');
            });
        }

        // ✅ 2. Drop foreign keys safely (if exist)
        try {
            DB::statement('ALTER TABLE user_tax_categories DROP FOREIGN KEY user_tax_categories_user_id_foreign');
        } catch (\Exception $e) {}

        try {
            DB::statement('ALTER TABLE user_tax_categories DROP FOREIGN KEY user_tax_categories_tax_category_id_foreign');
        } catch (\Exception $e) {}

        // ✅ 3. Drop old unique index if exists
        try {
            DB::statement('ALTER TABLE user_tax_categories DROP INDEX user_tax_categories_user_id_tax_category_id_unique');
        } catch (\Exception $e) {}

        // ✅ 4. Add new unique constraint
        Schema::table('user_tax_categories', function (Blueprint $table) {
            $table->unique(['user_id', 'tax_category_id', 'year'], 'user_tax_categories_unique');
        });

        // ✅ 5. Re-add foreign keys
        Schema::table('user_tax_categories', function (Blueprint $table) {
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('tax_category_id')
                ->references('id')
                ->on('tax_categories')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        // Reverse safely

        try {
            DB::statement('ALTER TABLE user_tax_categories DROP FOREIGN KEY user_tax_categories_user_id_foreign');
        } catch (\Exception $e) {}

        try {
            DB::statement('ALTER TABLE user_tax_categories DROP FOREIGN KEY user_tax_categories_tax_category_id_foreign');
        } catch (\Exception $e) {}

        try {
            DB::statement('ALTER TABLE user_tax_categories DROP INDEX user_tax_categories_unique');
        } catch (\Exception $e) {}

        if (Schema::hasColumn('user_tax_categories', 'year')) {
            Schema::table('user_tax_categories', function (Blueprint $table) {
                $table->dropColumn('year');
            });
        }

        Schema::table('user_tax_categories', function (Blueprint $table) {
            $table->unique(['user_id', 'tax_category_id']);

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('tax_category_id')->references('id')->on('tax_categories')->onDelete('cascade');
        });
    }
};
