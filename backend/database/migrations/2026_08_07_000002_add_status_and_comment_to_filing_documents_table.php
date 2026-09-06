<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('filing_documents', function (Blueprint $table) {
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->after('document_send_status');
            $table->text('comment')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('filing_documents', function (Blueprint $table) {
            $table->dropColumn(['status', 'comment']);
        });
    }
};
