<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Collapses the four duplicated column groups on payroll_agreements.
 *
 * The 2026-08-24 migration added the agreement's own content (title, body,
 * effective_date, price_type, price) alongside the original spec's columns
 * without reconciling them, leaving a fee in two places, a start date in two
 * places, the agreement text in two places, and two timestamps that accept()
 * always wrote the same value to. Which side survives was decided by the data:
 * the only agreement on the dev database populates effective_date / price /
 * price_type / body and leaves every legacy counterpart NULL.
 *
 *   start date   effective_date          <- service_start_date     (dropped)
 *   end date     end_date                <- service_end_date       (renamed)
 *   fee          price + price_type      <- fee_amount + fee_basis (dropped)
 *   currency     currency                <- fee_currency           (renamed)
 *   content      title + body            <- terms, included_services (dropped)
 *   acceptance   accepted_at             <- activated_at           (dropped)
 *
 * payroll_agreement_acceptances.terms_hash becomes content_hash: with `terms`
 * gone the hash is taken over the agreed content itself, which is what the
 * client actually saw. See Agreement::hashContent().
 *
 * Every drop is preceded by a COALESCE backfill, so a row that only ever filled
 * the legacy column keeps its value under the surviving name.
 */
return new class extends Migration
{
    /**
     * fee_basis carried a third option that price_type has no word for.
     * 'monthly_flat' is a period, not a unit of work, so it cannot be folded
     * into either 'per person' or 'total per run' without asserting something
     * the accountant never wrote. Those rows keep their amount in `price` and
     * come out with price_type NULL, which is a valid state — the column is
     * nullable and always has been.
     */
    private const FEE_BASIS_TO_PRICE_TYPE = [
        'per_employee_per_run' => 'per person',
        'per_pay_run'          => 'total per run',
    ];

    public function up(): void
    {
        // ---- backfill the survivors from their legacy twins -----------------

        DB::statement('UPDATE payroll_agreements SET effective_date = service_start_date WHERE effective_date IS NULL AND service_start_date IS NOT NULL');
        DB::statement('UPDATE payroll_agreements SET price = fee_amount WHERE price IS NULL AND fee_amount IS NOT NULL');
        DB::statement('UPDATE payroll_agreements SET accepted_at = activated_at WHERE accepted_at IS NULL AND activated_at IS NOT NULL');

        foreach (self::FEE_BASIS_TO_PRICE_TYPE as $basis => $priceType) {
            DB::table('payroll_agreements')
                ->whereNull('price_type')
                ->where('fee_basis', $basis)
                ->update(['price_type' => $priceType]);
        }

        // terms/included_services are JSON; flatten them into the prose body
        // rather than dropping text somebody wrote. Only rows with no body of
        // their own are touched.
        $rows = DB::table('payroll_agreements')
            ->select('id', 'terms', 'included_services')
            ->where(function ($q) {
                $q->whereNull('body')->orWhere('body', '');
            })
            ->where(function ($q) {
                $q->whereNotNull('terms')->orWhereNotNull('included_services');
            })
            ->get();

        foreach ($rows as $row) {
            $body = $this->flattenContent($row->terms, $row->included_services);

            if ($body !== '') {
                DB::table('payroll_agreements')->where('id', $row->id)->update(['body' => $body]);
            }
        }

        // ---- rename the two survivors that kept an orphaned prefix ----------
        //
        // Raw CHANGE rather than renameColumn(): the schema grammar resolves a
        // rename by reading the current column list back, and on the MariaDB
        // 10.4 this project runs it returns nothing for the second rename in a
        // blueprint, so the command compiles against a null column. Spelling
        // the definition out is also what the sibling payroll migrations do.

        DB::statement('ALTER TABLE payroll_agreements CHANGE service_end_date end_date DATE NULL');
        DB::statement("ALTER TABLE payroll_agreements CHANGE fee_currency currency CHAR(3) NOT NULL DEFAULT 'CAD'");

        // ---- drop the duplicates -------------------------------------------

        Schema::table('payroll_agreements', function (Blueprint $table) {
            $table->dropColumn([
                'service_start_date', 'fee_amount', 'fee_basis',
                'terms', 'included_services', 'activated_at',
            ]);
        });

        DB::statement('ALTER TABLE payroll_agreement_acceptances CHANGE terms_hash content_hash CHAR(64) NOT NULL');
    }

    /**
     * Reversible in shape, not in content. The legacy columns come back empty
     * except where the split is unambiguous: price/effective_date/accepted_at
     * are copied back into fee_amount/service_start_date/activated_at, since
     * nothing else could have populated them. fee_basis and the JSON pair
     * cannot be recovered — the fold to price_type is many-to-one and the
     * flattened text is prose by then, so they return NULL.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE payroll_agreement_acceptances CHANGE content_hash terms_hash CHAR(64) NOT NULL');

        DB::statement('ALTER TABLE payroll_agreements CHANGE end_date service_end_date DATE NULL');
        DB::statement("ALTER TABLE payroll_agreements CHANGE currency fee_currency CHAR(3) NOT NULL DEFAULT 'CAD'");

        Schema::table('payroll_agreements', function (Blueprint $table) {
            $table->date('service_start_date')->nullable()->after('effective_date');
            $table->decimal('fee_amount', 10, 2)->nullable()->after('service_end_date');
            $table->enum('fee_basis', ['per_pay_run', 'per_employee_per_run', 'monthly_flat'])->nullable()->after('fee_currency');
            $table->json('terms')->nullable()->after('price');
            $table->json('included_services')->nullable()->after('terms');
            $table->timestamp('activated_at')->nullable()->after('accepted_at');
        });

        DB::statement('UPDATE payroll_agreements SET service_start_date = effective_date, fee_amount = price, activated_at = accepted_at');
    }

    /** The JSON pair as readable prose, for the body backfill. */
    private function flattenContent(?string $terms, ?string $includedServices): string
    {
        $lines = [];

        foreach ((array) json_decode((string) $terms, true) as $key => $value) {
            if (! is_scalar($value)) {
                continue;
            }
            // 'services_provided' => 'Services provided'
            $lines[] = ucfirst(str_replace('_', ' ', (string) $key)) . ': ' . $value;
        }

        $services = array_filter((array) json_decode((string) $includedServices, true), 'is_scalar');

        if ($services !== []) {
            $lines[] = 'Included services: ' . implode(', ', $services);
        }

        return implode("\n", $lines);
    }
};
