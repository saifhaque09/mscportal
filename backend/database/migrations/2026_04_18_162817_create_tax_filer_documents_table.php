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
    Schema::create('tax_filer_documents', function (Blueprint $table) {
    $table->id();

    $table->unsignedBigInteger('user_tax_category_id')->nullable();
    $table->unsignedBigInteger('file_id');

    $table->enum('status', ['pending', 'approved', 'reupload'])->default('pending');
    $table->text('comments')->nullable();

    $table->string('month', 2)->nullable();

    $table->unsignedBigInteger('uploaded_by')->nullable();

    $table->softDeletes();
    $table->timestamps();

    // Foreign Keys (recommended)
    $table->foreign('user_tax_category_id')
          ->references('id')
          ->on('user_tax_categories')
          ->onDelete('cascade');

    $table->foreign('file_id')
          ->references('id')
          ->on('files')
          ->onDelete('cascade');

    $table->foreign('uploaded_by')
          ->references('id')
          ->on('users')
          ->onDelete('set null');
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_filer_documents');
    }
};
