<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Marks a document whose review status is final and must never be changed.
     *
     * Set only by Documents::bulkUpload() (Admin/Accountant bulk upload, which
     * lands on 'approved' straight away — there is nothing left to review, so
     * the status is frozen). Every other upload path leaves this false, so
     * client-uploaded documents keep the normal pending → approved/reupload
     * review flow.
     *
     * A stored flag rather than an "is the uploader an Admin/Accountant?"
     * lookup at status-change time: role assignments can change later, and the
     * lock has to reflect how the document was uploaded, not who that user
     * happens to be today.
     */
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->boolean('status_locked')->default(false)->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('status_locked');
        });
    }
};
