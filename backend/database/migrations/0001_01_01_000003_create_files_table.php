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
        Schema::create('files', function (Blueprint $table) {
            $table->id();
            $table->enum('group', ['document', 'profile_image', 'logo', 'favicon', 'agreement'])->default ('document');
            $table->string('title', 100)->nullable();
            $table->string('file_name', 100)->nullable();
            $table->string('file_alt', 100)->nullable();
            $table->string('file_hash', 100);
            $table->string('file_size', 50);
            $table->text('file_path');
            $table->string('file_type', 100);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('files_log', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('file_id');
            $table->timestamp('last_accessed_on')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
