<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('individual_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->string('number', 64)->unique();
            $table->unsignedSmallInteger('tax_year');
            $table->string('service_type')->default('T4 processing');
            $table->string('description');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('hst_rate', 5, 2)->default(13);
            $table->decimal('hst_amount', 12, 2);
            $table->decimal('total', 12, 2);
            $table->date('issued_at');
            $table->date('due_at');
            $table->enum('status', ['issued', 'paid', 'overdue', 'cancelled'])->default('issued');
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_method')->nullable();
            $table->string('transaction_id')->nullable();
            $table->timestamps();
            $table->index(['client_id', 'tax_year']);
        });
    }

    public function down(): void { Schema::dropIfExists('individual_invoices'); }
};
