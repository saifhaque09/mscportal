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
        // Individual tax filers have no firm_id on their users row, so a
        // payment for one can't set payments.firm_id — allow NULL there.
        // firm_id null = individual-taxfiler payment, not null = business
        // payment; client_id (FK->users) identifies the person either way.
        Schema::table('payments', function (Blueprint $table) {
            $table->unsignedBigInteger('firm_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->unsignedBigInteger('firm_id')->nullable(false)->change();
        });
    }
};
