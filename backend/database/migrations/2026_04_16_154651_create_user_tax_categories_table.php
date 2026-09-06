<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_tax_categories', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('tax_category_id');

            $table->timestamps();

            // 🔥 Prevent duplicate entries
            $table->unique(['user_id', 'tax_category_id']);

            // 🔗 Foreign keys (recommended)
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('tax_category_id')
                ->references('id')
                ->on('tax_categories')
                ->onDelete('cascade');
        });
         
        Schema::table('tax_categories', function (Blueprint $table) 
        { 
            $table->renameColumn('slug', 'code');
        });
 
    }

    public function down(): void
    {
        Schema::dropIfExists('user_tax_categories');

        Schema::table('tax_categories', function (Blueprint $table) 
        { 
            $table->renameColumn('code', 'slug');
        });
    }
};
