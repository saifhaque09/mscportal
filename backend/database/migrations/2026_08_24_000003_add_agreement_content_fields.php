<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The agreement's own content, entered on create, plus a decimal version and a
 * 'Sent' status.
 *
 * New columns: title, body, effective_date, price_type, price.
 *
 * version becomes DECIMAL(4,1). It steps 1.0 → 1.1 → … → 1.9 → 2.0, which is
 * just +0.1 each time — the roll from 1.9 to 2.0 needs no special case, so the
 * generator counts in tenths. Existing integer versions widen cleanly (1 → 1.0)
 * and the (firm_id, version) unique index still holds.
 *
 * 'Sent' is added to status, which retires the timestamp trick the previous
 * migration had to use: 'Pending' + sent_at meant "with the client" only
 * because there was no value for it. Rows in that state are migrated to 'Sent',
 * and the model's predicates now read the status directly. sent_at stays — it
 * is still the audit record of when it went out.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payroll_agreements', function (Blueprint $table) {
            $table->string('title')->nullable()->after('guid');
            $table->longText('body')->nullable()->after('title');
            $table->date('effective_date')->nullable()->after('period_anchor_date');
            $table->enum('price_type', ['per person', 'total per run'])->nullable()->after('fee_basis');
            $table->decimal('price', 12, 2)->nullable()->after('price_type');
        });

        DB::statement("ALTER TABLE payroll_agreements MODIFY version DECIMAL(4,1) UNSIGNED NOT NULL DEFAULT 1.0");

        DB::statement("ALTER TABLE payroll_agreements MODIFY status VARCHAR(32) NOT NULL DEFAULT 'Pending'");
        DB::table('payroll_agreements')->where('status', 'Pending')->whereNotNull('sent_at')->update(['status' => 'Sent']);
        DB::statement("ALTER TABLE payroll_agreements MODIFY status ENUM('Pending','Sent','Inactive','Agreed','Reject') NOT NULL DEFAULT 'Pending'");
    }

    /**
     * Reversing version truncates the minor part: 1.0 and 1.1 both become 1,
     * which collides on the (firm_id, version) unique index once a firm has
     * more than one revision. The rows are renumbered 1..n per firm first, in
     * version order, so the rollback cannot fail on a real dataset.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE payroll_agreements MODIFY status VARCHAR(32) NOT NULL DEFAULT 'Pending'");
        DB::table('payroll_agreements')->where('status', 'Sent')->update(['status' => 'Pending']);
        DB::statement("ALTER TABLE payroll_agreements MODIFY status ENUM('Pending','Inactive','Agreed','Reject') NOT NULL DEFAULT 'Pending'");

        DB::statement("ALTER TABLE payroll_agreements MODIFY version DECIMAL(6,1) UNSIGNED NOT NULL DEFAULT 1.0");

        foreach (DB::table('payroll_agreements')->distinct()->pluck('firm_id') as $firmId) {
            $rows = DB::table('payroll_agreements')->where('firm_id', $firmId)->orderBy('version')->pluck('id');
            // Renumber high first, so an intermediate value never collides with
            // one still to be moved.
            foreach ($rows->reverse()->values() as $offset => $id) {
                DB::table('payroll_agreements')->where('id', $id)->update(['version' => $rows->count() - $offset]);
            }
        }

        DB::statement("ALTER TABLE payroll_agreements MODIFY version INT UNSIGNED NOT NULL DEFAULT 1");

        Schema::table('payroll_agreements', function (Blueprint $table) {
            $table->dropColumn(['title', 'body', 'effective_date', 'price_type', 'price']);
        });
    }
};
