<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('filings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('firm_id')->constrained('firms')->cascadeOnDelete();
            $table->year('year');
            $table->string('filing_type', 100);
            $table->enum('status', ['draft', 'sent', 'signed', 'filed'])->default('draft');
            $table->foreignId('started_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamp('filed_at')->nullable();
            $table->string('cra_confirmation_number', 100)->nullable();
            $table->timestamps();

            $table->unique(['firm_id', 'year', 'filing_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('filings');
    }
};
