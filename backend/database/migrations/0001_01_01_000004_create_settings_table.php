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
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 150);
            $table->text('value');
            $table->string('context', 255);
            $table->unique(['context', 'key']);
            $table->bigInteger('user_id')->unsigned()->nullable();
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};

