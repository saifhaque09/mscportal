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
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['accountant_id']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->renameColumn('accountant_id', 'admin_id');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->foreign('admin_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['admin_id']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->renameColumn('admin_id', 'accountant_id');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->foreign('accountant_id')->references('id')->on('users')->nullOnDelete();
        });
    }
};
