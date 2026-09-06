<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sub_tax_category_codes', function (Blueprint $table) {
            if (! $this->hasIndex('sub_tax_category_codes', 'sub_tax_category_codes_user_id_index')) {
                $table->index('user_id', 'sub_tax_category_codes_user_id_index');
            }

            if (! $this->hasIndex('sub_tax_category_codes', 'sub_tax_category_codes_sub_tax_category_id_index')) {
                $table->index('sub_tax_category_id', 'sub_tax_category_codes_sub_tax_category_id_index');
            }

            if ($this->hasIndex('sub_tax_category_codes', 'subtax_user_code_unique')) {
                $table->dropUnique('subtax_user_code_unique');
            }

            if (! $this->hasIndex('sub_tax_category_codes', 'subtax_user_code_value_unique')) {
                $table->unique(
                    ['user_id', 'sub_tax_category_id', 'code', 'value'],
                    'subtax_user_code_value_unique'
                );
            }
        });
    }

    public function down(): void
    {
        Schema::table('sub_tax_category_codes', function (Blueprint $table) {
            if ($this->hasIndex('sub_tax_category_codes', 'subtax_user_code_value_unique')) {
                $table->dropUnique('subtax_user_code_value_unique');
            }

            if (! $this->hasIndex('sub_tax_category_codes', 'subtax_user_code_unique')) {
                $table->unique(
                    ['user_id', 'sub_tax_category_id', 'code'],
                    'subtax_user_code_unique'
                );
            }
        });
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        return DB::table('information_schema.STATISTICS')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', $table)
            ->where('INDEX_NAME', $indexName)
            ->exists();
    }
};
