<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_status_sub_tax_categories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->constrained()
                  ->cascadeOnDelete();

            $table->year('year');

            $table->foreignId('sub_tax_category_id')
                  ->constrained('sub_tax_categories')
                  ->cascadeOnDelete();

            $table->enum('status', [
                'locked',
                'unlocked'
            ])->default('unlocked');

            $table->timestamps();

            // unique constraint
            $table->unique(
                ['user_id', 'year', 'sub_tax_category_id'],
                'user_status_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_status_sub_tax_categories');
    }
};
