<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_run_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
            $table->foreignId('payroll_employee_id')->constrained('payroll_employees')->cascadeOnDelete();

            // Snapshots taken when the line is created. A later rename or raise
            // must not rewrite what was actually submitted, and the export has
            // to reproduce the run exactly as it was approved.
            $table->string('employee_number', 50)->nullable();
            $table->string('employee_name', 200);
            $table->enum('pay_basis', ['hourly', 'salary', 'commission']);
            $table->enum('rate_type', ['hourly', 'annual_salary', 'per_period_salary']);
            $table->decimal('rate_amount', 12, 2);
            $table->foreignId('payroll_employee_rate_id')->nullable()
                ->constrained('payroll_employee_rates')->nullOnDelete();

            $table->decimal('regular_hours', 8, 2)->default(0);
            $table->decimal('overtime_hours', 8, 2)->default(0);
            $table->decimal('stat_holiday_hours', 8, 2)->default(0);
            $table->decimal('vacation_hours', 8, 2)->default(0);
            $table->decimal('sick_hours', 8, 2)->default(0);
            $table->decimal('overtime_rate_multiplier', 4, 2)->default(1.50);

            $table->decimal('salary_amount', 12, 2)->default(0);
            $table->decimal('bonus_amount', 12, 2)->default(0);
            $table->decimal('commission_amount', 12, 2)->default(0);
            $table->decimal('other_earnings_amount', 12, 2)->default(0);
            $table->decimal('reimbursement_amount', 12, 2)->default(0);
            $table->decimal('deduction_amount', 12, 2)->default(0);
            $table->string('other_earnings_label', 100)->nullable();
            $table->string('deduction_label', 100)->nullable();

            // Computed server-side on every save, never accepted from the
            // client. Gross only — CPP, EI and income tax stay with the
            // external payroll software.
            $table->decimal('gross_amount', 14, 2)->default(0);

            $table->enum('status', ['ok', 'flagged', 'excluded'])->default('ok');
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['payroll_run_id', 'payroll_employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_run_lines');
    }
};
