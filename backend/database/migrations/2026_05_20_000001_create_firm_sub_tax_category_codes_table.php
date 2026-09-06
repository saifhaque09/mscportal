<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('firm_sub_tax_category_codes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('firm_id')
                  ->constrained('firms')
                  ->cascadeOnDelete();

            $table->unsignedBigInteger('added_by')->nullable();
            $table->foreign('added_by')->references('id')->on('users')->nullOnDelete();

            $table->foreignId('sub_tax_category_id')
                  ->constrained('sub_tax_categories')
                  ->cascadeOnDelete();

            $table->string('code');
            $table->decimal('value', 12, 2)->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');

            $table->timestamps();

            $table->unique(
                ['firm_id', 'sub_tax_category_id', 'code', 'value'],
                'firm_subtax_code_value_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('firm_sub_tax_category_codes');
    }
};
