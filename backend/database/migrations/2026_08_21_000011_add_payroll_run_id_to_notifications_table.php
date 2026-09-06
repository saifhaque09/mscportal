<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // notifications.filing_id is a real FK constrained to filings, so it
        // cannot carry a payroll run id. Payroll deep-links need their own
        // column rather than a seventh positional argument on
        // Notification::record(), whose signature and callers stay untouched.
        Schema::table('notifications', function (Blueprint $table) {
            $table->foreignId('payroll_run_id')->nullable()->after('filing_id')
                ->constrained('payroll_runs')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payroll_run_id');
        });
    }
};
