<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_deadlines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('firms')->cascadeOnDelete();
            $table->foreignId('deadline_id')->constrained('deadlines')->cascadeOnDelete();
            $table->date('due_date');
            $table->enum('status', ['pending', 'completed', 'overdue'])->default('pending');
            $table->text('notes')->nullable();
            $table->unique(['organization_id', 'deadline_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_deadlines');
    }
};
