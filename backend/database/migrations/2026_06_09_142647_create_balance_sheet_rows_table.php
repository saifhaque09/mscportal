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
        Schema::create('balance_sheet_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('balance_sheet_reports')->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('balance_sheet_categories')->nullOnDelete();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('label');
            $table->string('row_type'); // section_header, data, total
            $table->decimal('amount', 15, 2)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->unsignedTinyInteger('level_depth')->default(0);
            $table->json('meta_json')->nullable();
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('balance_sheet_rows')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('balance_sheet_rows');
    }
};
