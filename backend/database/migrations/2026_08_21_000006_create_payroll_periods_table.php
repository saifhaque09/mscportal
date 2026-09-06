<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('firm_id')->constrained('firms')->cascadeOnDelete();

            // Snapshot, so changing firms.payment_type cannot rewrite history.
            $table->enum('pay_frequency', [
                'Monthly', 'Semi-Monthly', 'Bi-Weekly', 'Weekly', 'Bi-Monthly', 'Annual', 'Quarterly',
            ]);

            $table->unsignedSmallInteger('sequence');
            $table->year('year');
            $table->date('period_start');
            $table->date('period_end');
            $table->date('pay_date');
            $table->date('cutoff_date')->nullable();
            $table->enum('status', ['scheduled', 'open', 'closed', 'skipped'])->default('scheduled');
            $table->timestamps();

            // This constraint is what makes the "duplicate payroll period"
            // validation impossible to bypass.
            $table->unique(['firm_id', 'period_start', 'period_end']);
            $table->unique(['firm_id', 'year', 'sequence']);
            $table->index(['firm_id', 'pay_date'], 'payroll_periods_pay_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_periods');
    }
};
