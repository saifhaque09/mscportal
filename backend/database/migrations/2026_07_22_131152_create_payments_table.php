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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            // Replaces a "tax_return_id" link — filings are identified by
            // firm_id + year (+ filing_type) in this codebase, there is no
            // standalone tax_returns table.
            $table->foreignId('firm_id')->constrained('firms')->cascadeOnDelete();
            $table->year('year');

            $table->unsignedBigInteger('accountant_id')->nullable();
            $table->foreign('accountant_id')->references('id')->on('users')->nullOnDelete();

            $table->unsignedBigInteger('client_id')->nullable();
            $table->foreign('client_id')->references('id')->on('users')->nullOnDelete();

            $table->decimal('amount', 12, 2);
            $table->enum('payment_method', ['cash', 'e_payment']);
            $table->enum('status', ['pending', 'paid', 'cancelled'])->default('pending');
            $table->date('payment_date')->nullable();
            $table->text('remarks')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
