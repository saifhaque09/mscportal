<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('filing_documents', function (Blueprint $table) {
            $table->foreignId('file_id')->nullable()->change();
            $table->enum('document_send_status', ['link', 'signed_document'])->nullable()->after('document_type');
            $table->string('link')->nullable()->after('file_id');
        });
    }

    public function down(): void
    {
        Schema::table('filing_documents', function (Blueprint $table) {
            $table->dropColumn(['document_send_status', 'link']);
            $table->foreignId('file_id')->nullable(false)->change();
        });
    }
};
