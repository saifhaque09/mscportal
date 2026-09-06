<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The Individual/Taxfiler-client equivalent of
        // organization_user_assignments — same organization_roles /
        // organization_permissions catalog, reused as-is, just a separate
        // assignment table since the "client entity" is a taxfiler user
        // row rather than a firm.
        Schema::create('individual_user_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('taxfiler_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('organization_role_id')->constrained('organization_roles')->cascadeOnDelete();
            $table->unique(['taxfiler_id', 'user_id', 'organization_role_id'], 'ind_user_role_unique');
            $table->timestamps();
        });

        // Superseded by individual_user_assignments — a taxfiler can now
        // have a full team (Lead Accountant/Senior/Dataloader) like a firm
        // does, not just one flat "assigned accountant." No data migration
        // needed: this column was added moments ago in the same release
        // and no taxfiler has ever had it set.
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_accountant_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('assigned_accountant_id')
                ->nullable()
                ->after('firm_id')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::dropIfExists('individual_user_assignments');
    }
};
