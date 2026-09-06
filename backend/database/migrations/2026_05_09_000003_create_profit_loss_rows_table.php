<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profit_loss_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('profit_loss_reports')->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('profit_loss_categories')->nullOnDelete();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('label');
            $table->string('row_type');
            $table->decimal('amount', 15, 2)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->unsignedTinyInteger('level_depth')->default(0);
            $table->json('meta_json')->nullable();
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('profit_loss_rows')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profit_loss_rows');
    }
};
