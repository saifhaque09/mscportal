<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * done_status belongs to the subcategory (checklist item) as a whole, not
     * to each individual code/value row — moved to checklist_items instead
     * (see 2026_08_06_000003_add_done_status_to_checklist_items_table).
     */
    public function up(): void
    {
        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->dropColumn('done_status');
        });
    }

    public function down(): void
    {
        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->enum('done_status', ['not done', 'done'])->default('not done')->after('status');
        });
    }
};
