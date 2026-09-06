<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('firms', function (Blueprint $table) {
            $table->enum('payment_type', ['Monthly', 'Semi-Monthly', 'Bi-Weekly', 'Weekly'])->nullable()->after('address');
            $table->string('weekly_day')->nullable()->after('payment_type');
            $table->string('weekly_month')->nullable()->after('weekly_day');
        });
    }

    public function down(): void
    {
        Schema::table('firms', function (Blueprint $table) {
            $table->dropColumn(['payment_type', 'weekly_day', 'weekly_month']);
        });
    }
};
