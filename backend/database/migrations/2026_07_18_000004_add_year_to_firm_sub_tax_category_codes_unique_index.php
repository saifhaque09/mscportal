<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add the new index before dropping the old one — MySQL was using
        // firm_subtax_code_value_unique (leftmost columns firm_id,
        // sub_tax_category_id) to support the FKs on those columns, and
        // refuses to drop it while it's the only index backing them.
        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->unique(
                ['firm_id', 'sub_tax_category_id', 'year', 'code', 'value'],
                'firm_subtax_year_code_value_unique'
            );
        });

        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->dropUnique('firm_subtax_code_value_unique');
        });
    }

    public function down(): void
    {
        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->unique(
                ['firm_id', 'sub_tax_category_id', 'code', 'value'],
                'firm_subtax_code_value_unique'
            );
        });

        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->dropUnique('firm_subtax_year_code_value_unique');
        });
    }
};
