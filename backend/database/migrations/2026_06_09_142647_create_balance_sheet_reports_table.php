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
        Schema::create('balance_sheet_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('firms')->cascadeOnDelete();
            $table->string('source');
            $table->string('report_name');
            $table->string('currency', 10);
            $table->date('as_at_date');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('balance_sheet_reports');
    }
};
