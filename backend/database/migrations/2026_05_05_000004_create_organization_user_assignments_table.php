<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_user_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('firm_id')->constrained('firms')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('organization_role_id')->constrained('organization_roles')->cascadeOnDelete();
            $table->unique(['firm_id', 'user_id', 'organization_role_id'], 'org_user_role_unique');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_user_assignments');
    }
};
