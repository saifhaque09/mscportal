<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Which Accountant an Individual/Taxfiler client is assigned to
            // (the equivalent of organization_user_assignments for business
            // firms). Null means unassigned — visible to any staff, matching
            // today's behavior, until Admin explicitly assigns someone.
            $table->foreignId('assigned_accountant_id')
                ->nullable()
                ->after('firm_id')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_accountant_id');
        });
    }
};
