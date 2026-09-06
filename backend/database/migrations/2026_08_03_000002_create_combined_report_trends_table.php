<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('combined_report_trends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('combined_report_summaries')->cascadeOnDelete();
            $table->enum('trend_type', ['net_profit', 'net_expenses']);
            $table->year('year');
            $table->decimal('amount', 15, 2);
            $table->timestamps();

            $table->unique(['report_id', 'trend_type', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combined_report_trends');
    }
};
