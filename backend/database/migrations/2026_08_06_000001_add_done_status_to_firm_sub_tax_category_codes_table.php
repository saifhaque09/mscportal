<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->enum('done_status', ['not done', 'done'])->default('not done')->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->dropColumn('done_status');
        });
    }
};
