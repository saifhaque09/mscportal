<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 0 = "no personal owner" (global/shared row), used by every context
        // today and by the new general-settings org-default row going forward.
        DB::table('settings')->whereNull('user_id')->update(['user_id' => 0]);

        Schema::table('settings', function (Blueprint $table) {
            $table->dropUnique(['context', 'key']);
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->default(0)->nullable(false)->change();
            $table->unique(['context', 'key', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropUnique(['context', 'key', 'user_id']);
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->bigInteger('user_id')->unsigned()->nullable()->default(null)->change();
            $table->unique(['context', 'key']);
        });

        DB::table('settings')->where('user_id', 0)->update(['user_id' => null]);
    }
};
