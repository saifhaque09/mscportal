<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('firms', function (Blueprint $table) {
            $table->unsignedTinyInteger('weekly_day')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('firms', function (Blueprint $table) {
            $table->string('weekly_day')->nullable()->change();
        });
    }
};
