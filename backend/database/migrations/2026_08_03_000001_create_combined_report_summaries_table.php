<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('combined_report_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('firms')->cascadeOnDelete();

            $table->date('from_date');
            $table->date('to_date');
            $table->date('as_at_date');

            $table->decimal('operating_revenue', 15, 2);
            $table->decimal('non_operating_revenues', 15, 2);
            $table->decimal('other_adjustments', 15, 2);
            $table->decimal('gross_profit', 15, 2);

            $table->decimal('fixed_expenses', 15, 2);
            $table->decimal('other_expenses', 15, 2);
            $table->decimal('variable_expenses', 15, 2);
            $table->decimal('total_expenses', 15, 2);

            $table->decimal('net_profit', 15, 2);

            $table->decimal('cash_and_banks', 15, 2);
            $table->decimal('account_receivable', 15, 2);
            $table->decimal('inventory', 15, 2);
            $table->decimal('equipment', 15, 2);
            $table->decimal('total_assets', 15, 2);

            $table->decimal('account_payable', 15, 2);
            $table->decimal('loans_payable', 15, 2);
            $table->decimal('account_expenses', 15, 2);
            $table->decimal('total_liabilities', 15, 2);

            $table->decimal('total_equity', 15, 2);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combined_report_summaries');
    }
};
