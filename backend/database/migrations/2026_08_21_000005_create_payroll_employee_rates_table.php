<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_employee_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_employee_id')->constrained('payroll_employees')->cascadeOnDelete();
            $table->enum('rate_type', ['hourly', 'annual_salary', 'per_period_salary']);
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('CAD');

            // The rate in force for a period is the greatest effective_from
            // that is <= the period's pay_date. Rows are never mutated; a
            // change writes a new row and closes the previous one.
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->string('reason', 255)->nullable();

            // Kept despite the house convention of omitting created_by:
            // "who changed the pay rate, and when" is the reason this table exists.
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['payroll_employee_id', 'effective_from']);
            $table->index(['payroll_employee_id', 'effective_from'], 'payroll_rates_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_employee_rates');
    }
};
