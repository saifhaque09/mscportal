<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_run_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();

            // Deliberately string, not enum. This is an append-only history
            // table where a stale value is harmless, and an enum would force an
            // ALTER TABLE every time the state machine grows.
            $table->string('from_status', 40)->nullable();
            $table->string('to_status', 40);
            $table->string('action', 60);

            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_role', 40)->nullable();
            $table->text('note')->nullable();
            $table->json('meta')->nullable();

            // Write-once, matching activity_logs and notifications.
            $table->timestamp('created_at')->useCurrent();

            $table->index(['payroll_run_id', 'id'], 'payroll_run_events_run_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_run_events');
    }
};
