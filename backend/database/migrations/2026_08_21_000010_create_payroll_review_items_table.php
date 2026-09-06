<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_review_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
            // Null means the query is about the run as a whole, not one line.
            $table->foreignId('payroll_run_line_id')->nullable()
                ->constrained('payroll_run_lines')->nullOnDelete();
            $table->string('field', 60)->nullable();

            $table->enum('severity', ['info', 'change_required'])->default('change_required');
            $table->enum('status', ['open', 'addressed', 'resolved', 'withdrawn'])->default('open');
            $table->text('comment');

            $table->foreignId('raised_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('raised_at');
            $table->timestamp('addressed_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('resolution_note')->nullable();

            // Which review cycle raised this, so a second pass stays legible.
            $table->unsignedTinyInteger('round')->default(1);
            $table->timestamps();

            // The approve gate is one query against this index.
            $table->index(['payroll_run_id', 'status'], 'payroll_review_items_open_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_review_items');
    }
};
