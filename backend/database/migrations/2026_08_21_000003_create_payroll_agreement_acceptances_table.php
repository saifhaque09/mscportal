<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_agreement_acceptances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_agreement_id')->constrained('payroll_agreements')->cascadeOnDelete();
            $table->foreignId('accepted_by')->nullable()->constrained('users')->nullOnDelete();

            // Denormalised on purpose: the evidence has to survive the user
            // record being edited or deleted.
            $table->string('accepted_name', 200);
            $table->string('accepted_email', 200);
            $table->string('accepted_role', 50)->nullable();

            $table->enum('acceptance_method', ['portal_checkbox', 'uploaded_signature'])->default('portal_checkbox');
            $table->string('typed_signature', 200)->nullable();

            // sha256 of the canonical JSON of the agreement's terms at the
            // moment of acceptance. This is what makes the record tamper-evident
            // without generating a PDF.
            $table->char('terms_hash', 64);

            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('accepted_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_agreement_acceptances');
    }
};
