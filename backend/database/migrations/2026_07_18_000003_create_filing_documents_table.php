<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('filing_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('filing_id')->constrained('filings')->cascadeOnDelete();
            $table->enum('document_type', ['generated', 'signed']);
            $table->foreignId('file_id')->constrained('files')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('filing_documents');
    }
};
