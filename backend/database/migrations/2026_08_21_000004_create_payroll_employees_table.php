<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_employees', function (Blueprint $table) {
            $table->id();
            $table->string('guid', 10)->nullable()->unique();
            $table->foreignId('firm_id')->constrained('firms')->cascadeOnDelete();

            // Every payroll employee is a portal login. Name, email and SIN are
            // NOT duplicated here — they live on users / users.meta (encrypted).
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // The client's own number, used to match rows in the external
            // payroll software.
            $table->string('employee_number', 50)->nullable();
            $table->enum('employment_type', ['full_time', 'part_time', 'casual', 'contract', 'seasonal']);
            $table->enum('pay_basis', ['hourly', 'salary', 'commission']);
            $table->string('department', 100)->nullable();
            $table->string('job_title', 100)->nullable();

            $table->date('hire_date');
            $table->date('termination_date')->nullable();
            $table->string('termination_reason', 255)->nullable();
            // Terminate via status, never a delete — historical runs reference this row.
            $table->enum('status', ['active', 'on_leave', 'terminated'])->default('active');

            $table->char('province_of_employment', 2)->nullable();
            $table->decimal('standard_hours_per_period', 6, 2)->nullable();
            $table->decimal('vacation_pay_percent', 5, 2)->nullable();
            $table->enum('payment_method', ['direct_deposit', 'cheque'])->default('direct_deposit');
            $table->timestamps();

            $table->unique(['firm_id', 'user_id']);
            // MySQL permits multiple NULLs in a unique index, so employees
            // without a number are unconstrained.
            $table->unique(['firm_id', 'employee_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_employees');
    }
};
