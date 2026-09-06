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
        // ACL table
        Schema::create('acl', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('role_id');
            $table->string('group', 100);
            $table->string('category', 100);
            $table->string('path', 255);
            $table->smallInteger('menu_order')->nullable()->default(1);
            $table->string('controller', 255)->nullable();
            $table->string('action', 255)->nullable();
            $table->string('title', 255);
            $table->text('icon');
            $table->smallInteger('status')->nullable()->default(1);
            $table->text('options')->nullable();
            $table->unsignedBigInteger('parent_id')->nullable ();
            $table->unique(['role_id', 'group', 'path', 'category']);
            $table->timestamps();
            $table->foreign('parent_id')->references('id')->on('acl')->cascadeOnUpdate()->cascadeOnDelete();
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnUpdate()->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acl');
    }
};

