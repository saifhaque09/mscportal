<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->string('vendor_name', 255)->nullable()->after('value');
            $table->date('invoice_date')->nullable()->after('vendor_name');
            $table->string('invoice_number', 255)->nullable()->after('invoice_date');
            $table->decimal('gst_hst_tax', 12, 2)->nullable()->after('invoice_number');
        });

        // Add the new index before dropping the old one, same ordering as
        // the year-index migration — MySQL refuses to drop an index while
        // it's the only one backing the firm_id/sub_tax_category_id FKs.
        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->unique(
                ['firm_id', 'sub_tax_category_id', 'year', 'code', 'value', 'invoice_number'],
                'firm_subtax_year_code_value_invoice_unique'
            );
        });

        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->dropUnique('firm_subtax_year_code_value_unique');
        });
    }

    public function down(): void
    {
        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->unique(
                ['firm_id', 'sub_tax_category_id', 'year', 'code', 'value'],
                'firm_subtax_year_code_value_unique'
            );
        });

        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->dropUnique('firm_subtax_year_code_value_invoice_unique');
        });

        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->dropColumn(['vendor_name', 'invoice_date', 'invoice_number', 'gst_hst_tax']);
        });
    }
};
