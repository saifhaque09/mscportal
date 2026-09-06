<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('firms')->cascadeOnDelete();
            $table->enum('report_type', ['profit_loss', 'balance_sheet']);
            $table->foreignId('file_id')->constrained('files')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_documents');
    }
};
