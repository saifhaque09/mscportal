<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_role_id')->constrained('organization_roles')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('organization_permissions')->cascadeOnDelete();
            $table->unique(['organization_role_id', 'permission_id'], 'org_role_permission_unique');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_role_permissions');
    }
};
