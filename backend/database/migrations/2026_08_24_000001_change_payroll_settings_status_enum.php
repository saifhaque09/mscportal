<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Re-vocabulary payroll_settings.status to Pending / Inactive / Agreed / Reject.
 *
 * Old set was inactive / pending_agreement / active / suspended. The rename is
 * not one-to-one:
 *
 *   pending_agreement -> Pending    agreement raised, sitting with the client
 *   active            -> Agreed     client accepted; the only state runs may start in
 *   inactive          -> Inactive   payroll never set up, or switched off
 *   suspended         -> Inactive   FOLDED IN — the new set has no separate
 *                                   "was live, now stopped" state. Nothing is
 *                                   lost: termination is still recorded on the
 *                                   agreement (status 'terminated') and on
 *                                   payroll_settings.suspended_at.
 *   (no old value)    -> Reject     NEW — written when the client declines an
 *                                   agreement, which previously left
 *                                   payroll_settings untouched.
 *
 * Done via VARCHAR rather than a temporary superset ENUM: MySQL rejects an
 * ENUM holding both 'inactive' and 'Inactive' as a duplicated value, because
 * the column's collation is case-insensitive.
 *
 * That same case-insensitivity means MySQL will accept 'agreed' and silently
 * store 'Agreed'. PHP string comparison is case-SENSITIVE, so application code
 * must always use the exact casing above.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE payroll_settings MODIFY status VARCHAR(32) NOT NULL DEFAULT 'inactive'");

        DB::table('payroll_settings')->where('status', 'pending_agreement')->update(['status' => 'Pending']);
        DB::table('payroll_settings')->where('status', 'active')->update(['status' => 'Agreed']);
        DB::table('payroll_settings')->whereIn('status', ['inactive', 'suspended'])->update(['status' => 'Inactive']);

        DB::statement("ALTER TABLE payroll_settings MODIFY status ENUM('Pending','Inactive','Agreed','Reject') NOT NULL DEFAULT 'Pending'");
    }

    /**
     * Reversible except for the fold: a row that was 'suspended' comes back as
     * 'inactive', and a 'Reject' row — which had no old equivalent — also comes
     * back as 'inactive'. suspended_at still distinguishes them.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE payroll_settings MODIFY status VARCHAR(32) NOT NULL DEFAULT 'Pending'");

        DB::table('payroll_settings')->where('status', 'Pending')->update(['status' => 'pending_agreement']);
        DB::table('payroll_settings')->where('status', 'Agreed')->update(['status' => 'active']);
        DB::table('payroll_settings')->whereIn('status', ['Inactive', 'Reject'])->update(['status' => 'inactive']);

        DB::statement("ALTER TABLE payroll_settings MODIFY status ENUM('inactive','pending_agreement','active','suspended') NOT NULL DEFAULT 'inactive'");
    }
};
