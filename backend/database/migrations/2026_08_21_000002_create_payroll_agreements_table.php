<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_agreements', function (Blueprint $table) {
            $table->id();
            // A firm has many versions and the client accepts one specific
            // version, so {firm_guid} alone cannot address a row.
            $table->string('guid', 10)->nullable()->unique();
            $table->foreignId('firm_id')->constrained('firms')->cascadeOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->enum('status', [
                'draft', 'sent', 'accepted', 'active', 'superseded', 'terminated',
            ])->default('draft');

            $table->enum('pay_frequency', [
                'Monthly', 'Semi-Monthly', 'Bi-Weekly', 'Weekly', 'Bi-Monthly', 'Annual', 'Quarterly',
            ]);
            $table->date('period_anchor_date')->nullable();
            $table->date('service_start_date')->nullable();
            $table->date('service_end_date')->nullable();

            $table->decimal('fee_amount', 10, 2)->nullable();
            $table->char('fee_currency', 3)->default('CAD');
            $table->enum('fee_basis', ['per_pay_run', 'per_employee_per_run', 'monthly_flat'])->nullable();

            // The clause set the client renders and accepts. No PDF is generated
            // server-side; the acceptance record plus terms_hash is the evidence.
            $table->json('terms')->nullable();
            $table->json('included_services')->nullable();
            $table->text('notes')->nullable();

            $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('viewed_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('terminated_at')->nullable();
            $table->text('decline_reason')->nullable();

            // Optional countersigned PDF, uploaded via Files::store() under the
            // existing 'agreement' group.
            $table->foreignId('signed_file_id')->nullable()->constrained('files')->nullOnDelete();
            $table->timestamps();

            // Deliberately not unique on firm_id — versioning is the point.
            // "At most one active" is a controller guard; MySQL has no partial
            // unique index.
            $table->unique(['firm_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_agreements');
    }
};
