<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1️⃣ Add user_id column
        Schema::table('sub_tax_category_codes', function (Blueprint $table) {
            if (!Schema::hasColumn('sub_tax_category_codes', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable()->after('id');
            }
        });

        // 2️⃣ Copy data from user_tax_category_id → user_id
        DB::statement('
            UPDATE sub_tax_category_codes stcc
            INNER JOIN user_tax_categories utc
                ON utc.id = stcc.user_tax_category_id
            SET stcc.user_id = utc.user_id
            WHERE stcc.user_tax_category_id IS NOT NULL
        ');

        // 3️⃣ Safety check
        $missingMappings = DB::table('sub_tax_category_codes')
            ->whereNull('user_id')
            ->count();

        if ($missingMappings > 0) {
            throw new RuntimeException(
                'Some rows could not be mapped to user_id.'
            );
        }

        // 4️⃣ Modify structure safely
        Schema::table('sub_tax_category_codes', function (Blueprint $table) {

            // ❗ FIRST: Drop foreign key (VERY IMPORTANT)
            if ($this->hasForeignKey('sub_tax_category_codes', 'sub_tax_category_codes_user_tax_category_id_foreign')) {
                $table->dropForeign(['user_tax_category_id']);
            }

            // ❗ THEN: Drop unique index
            if ($this->hasIndex('sub_tax_category_codes', 'subtax_code_unique')) {
                $table->dropUnique('subtax_code_unique');
            }

            // 5️⃣ Add new foreign key
            if (!$this->hasForeignKey('sub_tax_category_codes', 'sub_tax_category_codes_user_id_foreign')) {
                $table->foreign('user_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('cascade');
            }

            // 6️⃣ Drop old column
            if (Schema::hasColumn('sub_tax_category_codes', 'user_tax_category_id')) {
                $table->dropColumn('user_tax_category_id');
            }

            // 7️⃣ Add new unique constraint
            if (!$this->hasIndex('sub_tax_category_codes', 'sub_tax_category_codes_user_id_index')) {
                $table->index('user_id', 'sub_tax_category_codes_user_id_index');
            }

            if (!$this->hasIndex('sub_tax_category_codes', 'sub_tax_category_codes_sub_tax_category_id_index')) {
                $table->index('sub_tax_category_id', 'sub_tax_category_codes_sub_tax_category_id_index');
            }

            if ($this->hasIndex('sub_tax_category_codes', 'subtax_user_code_unique')) {
                $table->dropUnique('subtax_user_code_unique');
            }

            if (!$this->hasIndex('sub_tax_category_codes', 'subtax_user_code_value_unique')) {
                $table->unique(
                    ['user_id', 'sub_tax_category_id', 'code', 'value'],
                    'subtax_user_code_value_unique'
                );
            }
        });
    }

    public function down(): void
    {
        // 1️⃣ Add back old column
        Schema::table('sub_tax_category_codes', function (Blueprint $table) {
            if (!Schema::hasColumn('sub_tax_category_codes', 'user_tax_category_id')) {
                $table->unsignedBigInteger('user_tax_category_id')->nullable()->after('id');
            }
        });

        // 2️⃣ Restore data
        DB::statement('
            UPDATE sub_tax_category_codes stcc
            INNER JOIN user_tax_categories utc
                ON utc.user_id = stcc.user_id
            SET stcc.user_tax_category_id = utc.id
            WHERE stcc.user_id IS NOT NULL
        ');

        // 3️⃣ Restore structure
        Schema::table('sub_tax_category_codes', function (Blueprint $table) {

            // Drop new unique
            if ($this->hasIndex('sub_tax_category_codes', 'subtax_user_code_value_unique')) {
                $table->dropUnique('subtax_user_code_value_unique');
            }

            if ($this->hasIndex('sub_tax_category_codes', 'subtax_user_code_unique')) {
                $table->dropUnique('subtax_user_code_unique');
            }

            // Drop new FK
            if ($this->hasForeignKey('sub_tax_category_codes', 'sub_tax_category_codes_user_id_foreign')) {
                $table->dropForeign(['user_id']);
            }

            // Drop user_id
            if (Schema::hasColumn('sub_tax_category_codes', 'user_id')) {
                $table->dropColumn('user_id');
            }

            // Restore old FK
            if (!$this->hasForeignKey('sub_tax_category_codes', 'sub_tax_category_codes_user_tax_category_id_foreign')) {
                $table->foreign('user_tax_category_id')
                    ->references('id')
                    ->on('user_tax_categories')
                    ->onDelete('cascade');
            }

            // Restore old unique
            if (!$this->hasIndex('sub_tax_category_codes', 'subtax_code_unique')) {
                $table->unique(
                    ['user_tax_category_id', 'sub_tax_category_id', 'code'],
                    'subtax_code_unique'
                );
            }
        });
    }

    // 🔍 Helper: Check FK
    private function hasForeignKey(string $table, string $constraint): bool
    {
        return DB::table('information_schema.TABLE_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', $table)
            ->where('CONSTRAINT_NAME', $constraint)
            ->where('CONSTRAINT_TYPE', 'FOREIGN KEY')
            ->exists();
    }

    // 🔍 Helper: Check Index
    private function hasIndex(string $table, string $indexName): bool
    {
        return DB::table('information_schema.STATISTICS')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', $table)
            ->where('INDEX_NAME', $indexName)
            ->exists();
    }
};
