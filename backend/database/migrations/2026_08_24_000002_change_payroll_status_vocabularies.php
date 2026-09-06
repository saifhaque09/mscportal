<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Splits the two payroll status columns into two distinct vocabularies.
 *
 * payroll_agreements.status
 *   enum('Pending','Inactive','Agreed','Reject') NOT NULL DEFAULT 'Pending'
 *
 *   Six lifecycle states collapse into four. The pairs that merge stay
 *   distinguishable through the timestamp columns that were already being
 *   stamped, which is what lets the state machine keep working:
 *
 *     draft      -> Pending   (sent_at IS NULL)
 *     sent       -> Pending   (sent_at IS NOT NULL)
 *     accepted   -> Agreed    (never actually written — accept() went straight
 *                              to 'active' — so this fold costs nothing)
 *     active     -> Agreed    (activated_at IS NOT NULL)
 *     superseded -> Inactive  (terminated_at IS NULL)
 *     terminated -> Inactive  (terminated_at IS NOT NULL)
 *
 *   'Reject' is new. decline() used to put the agreement back to 'draft'; it
 *   now sets 'Reject' and clears sent_at, so the accountant can still revise
 *   and re-send exactly as before.
 *
 * payroll_settings.status
 *   enum('Not Started','Submitted','Critical','Processed','Alerted')
 *   NOT NULL DEFAULT 'Not Started'
 *
 *   This column stops meaning "is payroll switched on" and becomes a progress
 *   indicator. Activation now lives entirely on the agreement (status
 *   'Agreed'), which is why Setting::isActive() is derived from the agreement
 *   rather than read off this column. Every old value therefore maps to
 *   'Not Started' — no information is lost, because the agreement rows carry
 *   the activation state that used to be duplicated here.
 *
 * Both alters go through VARCHAR rather than a temporary superset ENUM: MySQL
 * rejects an ENUM holding values that differ only by case as duplicates, and
 * ENUM matching is case-insensitive while PHP comparison is not — so always
 * use the exact casing above in application code.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE payroll_agreements MODIFY status VARCHAR(32) NOT NULL DEFAULT 'draft'");

        DB::table('payroll_agreements')->whereIn('status', ['draft', 'sent'])->update(['status' => 'Pending']);
        DB::table('payroll_agreements')->whereIn('status', ['accepted', 'active'])->update(['status' => 'Agreed']);
        DB::table('payroll_agreements')->whereIn('status', ['superseded', 'terminated'])->update(['status' => 'Inactive']);

        DB::statement("ALTER TABLE payroll_agreements MODIFY status ENUM('Pending','Inactive','Agreed','Reject') NOT NULL DEFAULT 'Pending'");

        DB::statement("ALTER TABLE payroll_settings MODIFY status VARCHAR(32) NOT NULL DEFAULT 'Pending'");
        DB::table('payroll_settings')->update(['status' => 'Not Started']);
        DB::statement("ALTER TABLE payroll_settings MODIFY status ENUM('Not Started','Submitted','Critical','Processed','Alerted') NOT NULL DEFAULT 'Not Started'");
    }

    /**
     * The agreement side reverses cleanly, because the timestamps that
     * disambiguated each merged pair are still there. A 'Reject' row goes back
     * to 'draft', which is exactly where the old decline() left it.
     *
     * The settings side cannot: the old vocabulary's activation meaning was
     * moved onto the agreement, so every row returns as 'Pending'.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE payroll_agreements MODIFY status VARCHAR(32) NOT NULL DEFAULT 'Pending'");

        DB::table('payroll_agreements')->where('status', 'Pending')->whereNull('sent_at')->update(['status' => 'draft']);
        DB::table('payroll_agreements')->where('status', 'Pending')->whereNotNull('sent_at')->update(['status' => 'sent']);
        DB::table('payroll_agreements')->where('status', 'Reject')->update(['status' => 'draft']);
        DB::table('payroll_agreements')->where('status', 'Agreed')->update(['status' => 'active']);
        DB::table('payroll_agreements')->where('status', 'Inactive')->whereNotNull('terminated_at')->update(['status' => 'terminated']);
        DB::table('payroll_agreements')->where('status', 'Inactive')->update(['status' => 'superseded']);

        DB::statement("ALTER TABLE payroll_agreements MODIFY status ENUM('draft','sent','accepted','active','superseded','terminated') NOT NULL DEFAULT 'draft'");

        DB::statement("ALTER TABLE payroll_settings MODIFY status VARCHAR(32) NOT NULL DEFAULT 'Not Started'");
        DB::table('payroll_settings')->update(['status' => 'Pending']);
        DB::statement("ALTER TABLE payroll_settings MODIFY status ENUM('Pending','Inactive','Agreed','Reject') NOT NULL DEFAULT 'Pending'");
    }
};
