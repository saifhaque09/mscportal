<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Repurpose the "FY Closing Date" deadline row as "GST/HST Remittance".
     *
     * Updated in place rather than deleted-and-reinserted so the row keeps its
     * id — every existing organization_deadlines row points at it by id and
     * stays intact, just displaying the new name/description.
     */
    public function up(): void
    {
        // Nothing to do if a prior run already renamed it (slug is unique, so
        // an insert here would fail rather than no-op).
        if (DB::table('deadlines')->where('slug', 'gst_hst_remittance')->exists()) {
            return;
        }

        DB::table('deadlines')->where('slug', 'fy_closing_date')->update([
            'name'        => 'GST/HST Remittance',
            'slug'        => 'gst_hst_remittance',
            'type'        => 'tax',
            'description' => 'Remit GST/HST collected to the CRA by the required due date.',
            'updated_at'  => now(),
        ]);
    }

    public function down(): void
    {
        if (DB::table('deadlines')->where('slug', 'fy_closing_date')->exists()) {
            return;
        }

        DB::table('deadlines')->where('slug', 'gst_hst_remittance')->update([
            'name'        => 'FY Closing Date',
            'slug'        => 'fy_closing_date',
            'type'        => 'tax',
            'description' => 'Books closing date for fiscal year end (15 days before the fiscal year end date)',
            'updated_at'  => now(),
        ]);
    }
};
