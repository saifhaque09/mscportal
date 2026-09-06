<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lets a filing-related notification deep-link straight to that filing
     * (e.g. staff notified a client signed) instead of only carrying a
     * generic title/message with nowhere for the frontend to send the user.
     */
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->foreignId('filing_id')->nullable()->after('type')
                  ->constrained('filings')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('filing_id');
        });
    }
};
