<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->index('firm_id', 'events_firm_id_index');
        });
        Schema::table('events', function (Blueprint $table) {
            $table->dropUnique('events_firm_name_date_time_unique');
            $table->unique(['firm_id', 'event_name', 'date', 'from_time', 'to_time'], 'events_firm_name_date_from_to_unique');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->index('firm_id', 'events_firm_id_index');
        });
        Schema::table('events', function (Blueprint $table) {
            $table->dropUnique('events_firm_name_date_from_to_unique');
            $table->unique(['firm_id', 'event_name', 'date', 'from_time'], 'events_firm_name_date_time_unique');
        });
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex('events_firm_id_index');
        });
    }
};
