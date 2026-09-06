<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * 'Draft' joins the agreement status vocabulary, and becomes what a saved
 * agreement holds until it is sent.
 *
 * This splits an overload rather than adding a sixth state. 'Pending' was
 * carrying two unrelated meanings at once:
 *
 *   1. the status of a real, saved agreement nobody has sent yet, and
 *   2. the value Runs::queue() reports for a firm with NO agreement row at all,
 *      because the row reports the column default when nothing is stored.
 *
 * Runs.php said as much in a comment — "'Pending' therefore covers both 'none
 * raised yet' and 'raised, awaiting the client'; current_agreement === null is
 * what tells those two apart" — which is a distinction the frontend should not
 * have to reconstruct from a second field. After this migration:
 *
 *   Draft     a saved agreement, still with the accountant   (rows hold this)
 *   Pending   no agreement has been raised for this firm     (no row holds it)
 *
 * So every existing 'Pending' row becomes 'Draft': by definition it is one the
 * accountant saved, since going out to the client has had its own 'Sent' value
 * since 2026-08-24. 'Pending' stays in the enum — it is the value the queue
 * still reports and filters on for a firm with nothing raised, and keeping it
 * addressable is what lets that filter round-trip.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Through VARCHAR rather than a superset ENUM: the column's collation is
        // case-insensitive, so an intermediate enum holding two spellings of the
        // same word is rejected outright. See patterns/rename-enum-values.md.
        DB::statement("ALTER TABLE payroll_agreements MODIFY status VARCHAR(32) NOT NULL DEFAULT 'Pending'");

        DB::table('payroll_agreements')->where('status', 'Pending')->update(['status' => 'Draft']);

        DB::statement("ALTER TABLE payroll_agreements MODIFY status ENUM('Draft','Pending','Sent','Inactive','Agreed','Reject') NOT NULL DEFAULT 'Draft'");
    }

    /**
     * Fully reversible: 'Draft' is exactly the set of rows that read 'Pending'
     * before, so folding it back loses nothing.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE payroll_agreements MODIFY status VARCHAR(32) NOT NULL DEFAULT 'Pending'");

        DB::table('payroll_agreements')->where('status', 'Draft')->update(['status' => 'Pending']);

        DB::statement("ALTER TABLE payroll_agreements MODIFY status ENUM('Pending','Sent','Inactive','Agreed','Reject') NOT NULL DEFAULT 'Pending'");
    }
};
