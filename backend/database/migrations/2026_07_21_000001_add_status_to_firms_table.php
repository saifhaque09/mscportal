<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Draft/active lifecycle for client organizations: a firm stays 'draft'
 * (hidden from Accountant/Staff client lists) until an Accountant or Admin
 * is assigned to it. Defaults to 'active' so existing firms — created
 * before this concept existed — aren't retroactively hidden; only firms
 * created going forward start as 'draft' (set explicitly in Firms::create()).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('firms', function (Blueprint $table) {
            $table->enum('status', ['draft', 'active'])->default('active')->after('guid');
        });
    }

    public function down(): void
    {
        Schema::table('firms', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
