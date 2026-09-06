<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->id();
            // The primary addressable object — both portals deep-link to it
            // from notifications and from the cross-firm review queue.
            $table->string('guid', 10)->nullable()->unique();
            $table->foreignId('firm_id')->constrained('firms')->cascadeOnDelete();
            $table->foreignId('payroll_period_id')->unique()->constrained('payroll_periods')->cascadeOnDelete();

            // The last three values are unreachable in this phase. They are in
            // the enum now so the payslip phase needs no ALTER TABLE.
            $table->enum('status', [
                'draft', 'submitted', 'in_review', 'client_update_required', 'resubmitted',
                'ready_to_process', 'processing', 'payslips_uploaded', 'processed', 'cancelled',
            ])->default('draft');

            $table->unsignedInteger('version')->default(1);
            $table->unsignedSmallInteger('employee_count')->default(0);
            $table->decimal('total_hours', 10, 2)->default(0);
            $table->decimal('total_gross', 14, 2)->default(0);
            $table->char('currency', 3)->default('CAD');

            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('review_started_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('changes_requested_at')->nullable();
            $table->timestamp('resubmitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('processing_started_at')->nullable();
            $table->timestamp('payslips_uploaded_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('cancellation_reason', 255)->nullable();

            $table->text('client_note')->nullable();
            $table->text('accountant_note')->nullable();

            // Unused in this phase — exports stream rather than being persisted.
            $table->foreignId('export_file_id')->nullable()->constrained('files')->nullOnDelete();
            $table->timestamps();

            $table->index(['firm_id', 'status'], 'payroll_runs_firm_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_runs');
    }
};
