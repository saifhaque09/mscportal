<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('firms', function (Blueprint $table) {
            $table->text('financial_year_end')->nullable()->after('tax_return');
        });

        // Backfill from existing tax_return.occurance = 'yearly' rows so
        // deadline calculations that used to derive FY end from tax_return
        // keep working once OrganizationDeadlineService reads the new column.
        DB::table('firms')
            ->whereNotNull('tax_return')
            ->orderBy('id')
            ->each(function ($firm) {
                $taxReturn = json_decode($firm->tax_return, true);

                if (! is_array($taxReturn) || ($taxReturn['occurance'] ?? null) !== 'yearly') {
                    return;
                }

                if (empty($taxReturn['month']) || empty($taxReturn['day'])) {
                    return;
                }

                DB::table('firms')
                    ->where('id', $firm->id)
                    ->update([
                        'financial_year_end' => json_encode([
                            'month' => (int) $taxReturn['month'],
                            'day'   => (int) $taxReturn['day'],
                        ]),
                    ]);
            });
    }

    public function down(): void
    {
        Schema::table('firms', function (Blueprint $table) {
            $table->dropColumn('financial_year_end');
        });
    }
};
