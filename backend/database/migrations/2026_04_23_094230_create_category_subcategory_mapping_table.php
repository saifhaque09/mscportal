<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_subcategory_mapping', function (Blueprint $table) {
    $table->id();

    $table->foreignId('tax_category_id')
          ->constrained('tax_categories')
          ->cascadeOnDelete();

    $table->foreignId('sub_tax_category_id')
          ->constrained('sub_tax_categories')
          ->cascadeOnDelete();

    // ✅ FIXED UNIQUE NAME
    $table->unique(
        ['tax_category_id', 'sub_tax_category_id'],
        'cat_sub_unique'
    );
});
    }

    public function down(): void
    {
        Schema::dropIfExists('category_subcategory_mapping');
    }
};
