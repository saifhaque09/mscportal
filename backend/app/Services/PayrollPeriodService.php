<?php

namespace App\Services;

use App\Modules\Clients\Models\Firm;
use App\Modules\Payroll\Models\Period;
use App\Modules\Payroll\Models\Setting;
use Illuminate\Support\Carbon;

/**
 * Canonical pay-period arithmetic.
 *
 * Separate from OrganizationDeadlineService because the two answer different
 * questions. That service answers "when is the next payroll due" — one
 * forward-looking date for a dashboard widget — and its Bi-Weekly branch is
 * literally now()->addDays(14), which gives a different answer every day it is
 * called. That is fine for a widget and useless as a schedule.
 *
 * Everything here is anchored instead: given a start date, the Nth period is
 * always the same regardless of when you ask. OrganizationDeadlineService
 * delegates to nextPayDateFor() so the frequency rules live in exactly one
 * place, and falls back to its own behaviour for firms with no payroll anchor.
 */
class PayrollPeriodService
{
    /**
     * Build $count consecutive periods starting from $anchor.
     *
     * $anchor is the FIRST DAY of the first period. Each entry is
     * ['period_start', 'period_end', 'pay_date', 'cutoff_date'] as Y-m-d strings.
     */
    public function periodsFor(
        string $frequency,
        Carbon $anchor,
        int $count,
        int $payDayOffset = 0,
        int $cutoffDaysBeforePay = 0
    ): array {
        $periods = [];
        $start = $anchor->copy()->startOfDay();

        for ($i = 0; $i < $count; $i++) {
            $end = $this->periodEndFor($frequency, $start);
            $payDate = $end->copy()->addDays($payDayOffset);

            $periods[] = [
                'period_start' => $start->toDateString(),
                'period_end'   => $end->toDateString(),
                'pay_date'     => $payDate->toDateString(),
                'cutoff_date'  => $payDate->copy()->subDays($cutoffDaysBeforePay)->toDateString(),
            ];

            $start = $end->copy()->addDay();
        }

        return $periods;
    }

    /**
     * The last day of the period that begins on $start.
     *
     * Month-based frequencies deliberately avoid addMonth() on the start date:
     * anchoring on the 31st and repeatedly adding a month drifts
     * (Jan 31 -> Feb 28 -> Mar 28 -> ...). Working from startOfMonth and taking
     * endOfMonth keeps every period aligned to real calendar months.
     */
    private function periodEndFor(string $frequency, Carbon $start): Carbon
    {
        return match ($frequency) {
            'Weekly'    => $start->copy()->addDays(6),
            'Bi-Weekly' => $start->copy()->addDays(13),

            // 1st-15th and 16th-end of month. The anchor only decides which
            // half the schedule opens on.
            'Semi-Monthly' => $start->day <= 15
                ? $start->copy()->day(15)
                : $start->copy()->endOfMonth()->startOfDay(),

            'Monthly'    => $start->copy()->startOfMonth()->endOfMonth()->startOfDay(),
            'Bi-Monthly' => $start->copy()->startOfMonth()->addMonthsNoOverflow(1)->endOfMonth()->startOfDay(),
            'Quarterly'  => $start->copy()->startOfMonth()->addMonthsNoOverflow(2)->endOfMonth()->startOfDay(),
            'Annual'     => $start->copy()->addYearNoOverflow()->subDay()->startOfDay(),

            default => $start->copy()->addDays(13),
        };
    }

    /**
     * Create or refresh the next $count periods for a firm.
     *
     * Idempotent: keyed on (firm_id, period_start, period_end), which is also
     * the unique index, so re-running never duplicates. Periods that already
     * have a run attached are left completely alone — rewriting the dates under
     * a submitted payroll would corrupt it.
     *
     * Returns the number of rows created or updated.
     */
    public function generateForFirm(Firm $firm, Setting $settings, ?int $count = null): int
    {
        $frequency = $settings->pay_frequency ?: $firm->payment_type;
        if (! $frequency) {
            return 0;
        }

        $anchor = $settings->period_anchor_date
            ? Carbon::parse($settings->period_anchor_date)
            : null;

        if (! $anchor) {
            return 0;
        }

        $count = $count ?? (int) config('payroll.periods_per_generate', 26);

        // Continue from the last period already on file rather than from the
        // anchor, so generating twice extends the schedule instead of
        // recreating it.
        $last = Period::where('firm_id', $firm->id)->orderByDesc('period_end')->first();
        $start = $last ? Carbon::parse($last->period_end)->addDay() : $anchor;

        $periods = $this->periodsFor(
            $frequency,
            $start,
            $count,
            (int) $settings->pay_day_offset,
            (int) $settings->cutoff_days_before_pay
        );

        $sequence = (int) Period::where('firm_id', $firm->id)->max('sequence');
        $written = 0;

        foreach ($periods as $p) {
            $existing = Period::where('firm_id', $firm->id)
                ->where('period_start', $p['period_start'])
                ->where('period_end', $p['period_end'])
                ->first();

            if ($existing && $existing->run()->exists()) {
                continue;
            }

            $sequence++;

            Period::updateOrCreate(
                [
                    'firm_id'      => $firm->id,
                    'period_start' => $p['period_start'],
                    'period_end'   => $p['period_end'],
                ],
                [
                    'pay_frequency' => $frequency,
                    'sequence'      => $existing->sequence ?? $sequence,
                    'year'          => (int) Carbon::parse($p['period_end'])->year,
                    'pay_date'      => $p['pay_date'],
                    'cutoff_date'   => $p['cutoff_date'],
                    'status'        => $existing->status ?? 'scheduled',
                ]
            );

            $written++;
        }

        return $written;
    }

    /**
     * The next pay date for a firm, for OrganizationDeadlineService.
     *
     * Returns null when the firm has no payroll anchor, so that service can
     * fall back to its own arithmetic and every firm without payroll keeps
     * behaving exactly as it did before this service existed.
     */
    public function nextPayDateFor(Firm $firm): ?Carbon
    {
        $settings = Setting::where('firm_id', $firm->id)->first();

        if (! $settings || ! $settings->period_anchor_date) {
            return null;
        }

        $frequency = $settings->pay_frequency ?: $firm->payment_type;
        if (! $frequency) {
            return null;
        }

        $today = Carbon::now()->startOfDay();

        // A stored period is the source of truth when one exists.
        $stored = Period::where('firm_id', $firm->id)
            ->whereDate('pay_date', '>=', $today)
            ->orderBy('pay_date')
            ->first();

        if ($stored) {
            return Carbon::parse($stored->pay_date)->startOfDay();
        }

        // Otherwise walk forward from the anchor. Bounded so a stale anchor
        // years in the past cannot spin.
        $start = Carbon::parse($settings->period_anchor_date)->startOfDay();
        $offset = (int) $settings->pay_day_offset;

        for ($i = 0; $i < 1000; $i++) {
            $end = $this->periodEndFor($frequency, $start);
            $payDate = $end->copy()->addDays($offset);

            if ($payDate->greaterThanOrEqualTo($today)) {
                return $payDate;
            }

            $start = $end->copy()->addDay();
        }

        return null;
    }
}
