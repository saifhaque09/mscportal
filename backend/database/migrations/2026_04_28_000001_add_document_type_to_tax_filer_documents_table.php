<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tax_filer_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('tax_filer_documents', 'document_type')) {
                $table->enum('document_type', [
                    'subcategory_document',
                    'income_tax_return',
                ])->default('subcategory_document')->after('file_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tax_filer_documents', function (Blueprint $table) {
            if (Schema::hasColumn('tax_filer_documents', 'document_type')) {
                $table->dropColumn('document_type');
            }
        });
    }
};
