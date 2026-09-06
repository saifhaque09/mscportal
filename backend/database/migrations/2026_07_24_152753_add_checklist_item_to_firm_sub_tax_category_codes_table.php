<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Business codes are scoped to the firm's own checklist item (e.g.
     * "All cash acquired") rather than the individual-taxpayer
     * sub_tax_categories taxonomy - that table only holds personal tax slip
     * types (T4, T2202, RC62...) and has no business-relevant rows, so it
     * was never a valid grouping for firm codes to begin with.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE firm_sub_tax_category_codes MODIFY sub_tax_category_id BIGINT UNSIGNED NULL');

        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->foreignId('checklist_item_id')->nullable()->after('sub_tax_category_id')
                  ->constrained('checklist_items')->nullOnDelete();

            $table->unique(
                ['firm_id', 'checklist_item_id', 'year', 'code', 'value'],
                'firm_checklist_item_year_code_value_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->dropUnique('firm_checklist_item_year_code_value_unique');
            $table->dropConstrainedForeignId('checklist_item_id');
        });

        DB::statement('ALTER TABLE firm_sub_tax_category_codes MODIFY sub_tax_category_id BIGINT UNSIGNED NOT NULL');
    }
};
