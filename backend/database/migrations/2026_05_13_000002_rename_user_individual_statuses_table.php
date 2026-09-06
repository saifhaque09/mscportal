<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('user_individual_statuses', 'user_individual_status');
    }

    public function down(): void
    {
        Schema::rename('user_individual_status', 'user_individual_statuses');
    }
};
