<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profit_loss_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('firms')->cascadeOnDelete();
            $table->string('source');
            $table->string('report_name');
            $table->string('currency', 10);
            $table->date('from_date');
            $table->date('to_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profit_loss_reports');
    }
};
