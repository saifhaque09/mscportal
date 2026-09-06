<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('firm_id')->unique()->constrained('firms')->cascadeOnDelete();
            $table->enum('status', ['inactive', 'pending_agreement', 'active', 'suspended'])->default('inactive');

            // Snapshot of firms.payment_type taken at activation. Kept here so a
            // later change to the firm record cannot silently reshape periods
            // that have already been generated.
            $table->enum('pay_frequency', [
                'Monthly', 'Semi-Monthly', 'Bi-Weekly', 'Weekly', 'Bi-Monthly', 'Annual', 'Quarterly',
            ])->nullable();

            // The schedule's origin. Required because OrganizationDeadlineService
            // computes Bi-Weekly as now()->addDays(14) — no anchor at all — which
            // is fine for a "next due" widget but unusable as a period schedule.
            $table->date('period_anchor_date')->nullable();

            $table->unsignedTinyInteger('pay_day_offset')->default(0);
            $table->unsignedTinyInteger('cutoff_days_before_pay')->default(3);
            $table->char('default_currency', 3)->default('CAD');
            $table->enum('export_format', ['generic_csv', 'xlsx'])->default('generic_csv');

            $table->timestamp('activated_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->foreignId('activated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_settings');
    }
};
