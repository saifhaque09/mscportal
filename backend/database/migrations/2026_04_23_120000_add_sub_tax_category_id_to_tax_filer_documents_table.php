<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tax_filer_documents', function (Blueprint $table) {
            $table->foreignId('sub_tax_category_id')
                ->nullable()
                ->after('user_tax_category_id')
                ->constrained('sub_tax_categories')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tax_filer_documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sub_tax_category_id');
        });
    }
};
