<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sub_tax_category_codes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_tax_category_id')
                  ->constrained('user_tax_categories')
                  ->cascadeOnDelete();

            $table->foreignId('sub_tax_category_id')
                  ->constrained('sub_tax_categories')
                  ->cascadeOnDelete();

            // box code like 14, 22
            $table->string('code');

            // value (amount)
            $table->decimal('value', 12, 2)->nullable();

            $table->enum('status', ['active', 'inactive'])->default('active');

            $table->timestamps();

            // prevent duplicate entries
            $table->unique(
                ['user_tax_category_id', 'sub_tax_category_id', 'code'],
                'subtax_code_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sub_tax_category_codes');
    }
};
