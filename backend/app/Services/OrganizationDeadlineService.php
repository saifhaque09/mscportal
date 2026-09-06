<?php

namespace App\Services;

use Carbon\Carbon;
use App\Modules\Clients\Models\Firm;
use App\Modules\Deadlines\Models\Deadline;
use App\Modules\Deadlines\Models\OrganizationDeadline;

class OrganizationDeadlineService
{
    /**
     * Generate or refresh all applicable organization deadlines for a firm.
     * Returns the number of records upserted.
     */
    public function generate(Firm $firm): int
    {
        $deadlines = Deadline::where('status', 'Active')->get()->keyBy('slug');
        $count     = 0;

        $fyEnd = $this->fiscalYearEnd($firm);

        // (1) Financial Year End
        if ($fyEnd && $deadline = $deadlines->get('year_end_financial_statements')) {
            $this->upsert($firm, $deadline, $fyEnd->copy());
            $count++;
        }

        // (1a) GST/HST Remittance — 15 days before fiscal year end
        if ($fyEnd && $deadline = $deadlines->get('gst_hst_remittance')) {
            $this->upsert($firm, $deadline, $fyEnd->copy()->subDays(15));
            $count++;
        }

        // (2) GST/HST Remittance Date — 1 month after period end
        if ($firm->hst_number || $firm->gst_number) {
            $periodEnd = $this->gstHstPeriodEnd($firm);

            if ($periodEnd) {
                $remittanceDate = $periodEnd->copy()->addMonth();

                if ($deadline = $deadlines->get('hst_return_filing')) {
                    $this->upsert($firm, $deadline, $remittanceDate);
                    $count++;
                }

                // (2a) HST Closing Date — 15 days before remittance
                if ($deadline = $deadlines->get('hst_closing_date')) {
                    $this->upsert($firm, $deadline, $remittanceDate->copy()->subDays(15));
                    $count++;
                }
            }
        }

        // (3) Corporate Income Tax Return (T2) — 6 months after FY end
        if ($fyEnd && $deadline = $deadlines->get('corporate_income_tax_return_t2')) {
            $this->upsert($firm, $deadline, $fyEnd->copy()->addMonths(6));
            $count++;
        }

        // (4) Corporate Tax Balance Payment for CCPCs — 3 months after FY end
        if ($fyEnd && $this->isCcpc($firm) && $deadline = $deadlines->get('corporate_tax_balance_payment_ccpcs')) {
            $this->upsert($firm, $deadline, $fyEnd->copy()->addMonths(3));
            $count++;
        }

        // (5) Payroll Deadline PD7A — 15 days after last day of current month
        if ($firm->payment_type && $deadline = $deadlines->get('payroll_tax_remittance_pd7a')) {
            $this->upsert($firm, $deadline, Carbon::now()->endOfMonth()->addDays(15)->startOfDay());
            $count++;
        }

        // (6) T4/T5 Deadline — February 28 of the current (or next) year
        if ($deadline = $deadlines->get('t4_submission')) {
            $t4Date = Carbon::createFromDate(Carbon::now()->year, 2, 28)->startOfDay();
            if ($t4Date->isPast()) {
                $t4Date->addYear();
            }
            $this->upsert($firm, $deadline, $t4Date);
            $count++;
        }

        // (7) Payroll Payment — derived from payroll_frequency
        $payrollSlug = $this->payrollSlug($firm);

        // Drop any payroll-due deadline left over from a previous
        // payment_type (e.g. switching Weekly -> Monthly must remove the
        // stale Weekly row, not leave both sitting in organization_deadlines).
        $stalePayrollDeadlineIds = $deadlines
            ->whereIn('slug', array_diff(self::PAYROLL_FREQUENCY_SLUGS, [$payrollSlug]))
            ->pluck('id');
        if ($stalePayrollDeadlineIds->isNotEmpty()) {
            OrganizationDeadline::where('organization_id', $firm->id)
                ->whereIn('deadline_id', $stalePayrollDeadlineIds)
                ->delete();
        }

        if ($payrollSlug && $deadline = $deadlines->get($payrollSlug)) {
            $payrollDate = $this->nextPayrollDate($firm);
            if ($payrollDate) {
                $this->upsert($firm, $deadline, $payrollDate);
                $count++;
            }
        }

        return $count;
    }

    /**
     * All deadline slugs that represent "next payroll due" for some
     * payment_type, including the legacy generic one — used to clean up a
     * stale row when the firm's payment_type changes.
     */
    private const PAYROLL_FREQUENCY_SLUGS = [
        'next_payroll_due',
        'next_payroll_due_weekly',
        'next_payroll_due_bi_weekly',
        'next_payroll_due_semi_monthly',
        'next_payroll_due_monthly',
        'next_payroll_due_bi_monthly',
        'next_payroll_due_annual',
        'next_payroll_due_quarterly',
    ];

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function upsert(Firm $firm, Deadline $deadline, Carbon $dueDate): void
    {
        OrganizationDeadline::updateOrCreate(
            [
                'organization_id' => $firm->id,
                'deadline_id'     => $deadline->id,
            ],
            [
                'due_date' => $dueDate->toDateString(),
            ]
        );
    }

    /**
     * Next upcoming fiscal year end from the firm's financial_year_end column.
     * Expects: financial_year_end.month, financial_year_end.day
     */
    private function fiscalYearEnd(Firm $firm): ?Carbon
    {
        $fyEnd = $firm->financial_year_end;

        $month = (int) ($fyEnd['month'] ?? 0);
        $day   = (int) ($fyEnd['day']   ?? 0);

        if (! $month || ! $day) {
            return null;
        }

        $date = Carbon::createFromDate(Carbon::now()->year, $month, $day)->startOfDay();

        if ($date->isPast()) {
            $date->addYear();
        }

        return $date;
    }

    /**
     * Most recent GST/HST period end.
     * Priority: firm->gst_hst_date.{month,day} (most recent past occurrence) →
     * meta.gst_hst_period_end override (explicit one-off date) → tax_return.occurance-derived:
     *   Monthly → last day of the previous month.
     *   Quarterly → last day of the most recently completed quarter.
     *   Yearly → fiscal year end of the prior year.
     */
    private function gstHstPeriodEnd(Firm $firm): ?Carbon
    {
        $gstHstDate = $firm->gst_hst_date;
        $month      = (int) ($gstHstDate['month'] ?? 0);
        $day        = (int) ($gstHstDate['day']   ?? 0);

        if ($month && $day) {
            $date = Carbon::createFromDate(Carbon::now()->year, $month, $day)->startOfDay();

            if ($date->isFuture()) {
                $date->subYear();
            }

            return $date;
        }

        $meta = $firm->meta ?? [];

        // Allow an explicit override stored in meta
        if (! empty($meta['gst_hst_period_end'])) {
            return Carbon::parse($meta['gst_hst_period_end'])->startOfDay();
        }

        $occurance = $firm->tax_return['occurance'] ?? null;

        return match ($occurance) {
            'monthly'   => Carbon::now()->subMonth()->endOfMonth()->startOfDay(),
            'quarterly' => Carbon::now()->startOfQuarter()->subDay()->startOfDay(),
            'yearly'    => $this->fiscalYearEnd($firm)?->copy()->subYear(),
            default     => null,
        };
    }

    /**
     * True if the firm is a Canadian Controlled Private Corporation.
     * Reads meta.is_ccpc (bool/1).
     */
    private function isCcpc(Firm $firm): bool
    {
        return ! empty($firm->meta['is_ccpc']);
    }

    /**
     * Maps the firm's payment_type to the matching deadline slug.
     */
    private function payrollSlug(Firm $firm): ?string
    {
        return match ($firm->payment_type) {
            'Weekly'       => 'next_payroll_due_weekly',
            'Bi-Weekly'    => 'next_payroll_due_bi_weekly',
            'Semi-Monthly' => 'next_payroll_due_semi_monthly',
            'Monthly'      => 'next_payroll_due_monthly',
            'Bi-Monthly'   => 'next_payroll_due_bi_monthly',
            'Annual'       => 'next_payroll_due_annual',
            'Quarterly'    => 'next_payroll_due_quarterly',
            default        => null,
        };
    }

    /**
     * Next payroll due date based on the firm's payment_type.
     * Weekly       → next occurrence of firm->weekly_day (ISO weekday, 1=Mon..7=Sun); today counts if it matches. Falls back to +7 days if unset.
     * Bi-Weekly    → +14 days from today
     * Semi-Monthly → the 15th of the month, or the last day of the month, whichever is next
     * Monthly      → end of the current month
     * Bi-Monthly   → end of the next even-numbered month (paid every other month)
     * Annual       → firm->weekly_month + firm->weekly_day as the due date; falls back to the fiscal year end if unset
     * Quarterly    → end of the current calendar quarter
     */
    private function nextPayrollDate(Firm $firm): ?Carbon
    {
        // When the firm has payroll set up, its real period schedule is the
        // authority — an anchored calendar, not "14 days from whenever this
        // happened to run". PayrollPeriodService returns null for every firm
        // without a payroll anchor, so firms that do not use the payroll module
        // keep the exact behaviour documented above.
        $fromPayroll = app(PayrollPeriodService::class)->nextPayDateFor($firm);
        if ($fromPayroll) {
            return $fromPayroll;
        }

        return $this->payrollDateFromFirmRecord($firm);
    }

    /**
     * The payroll date implied by the firm record alone — payment_type, plus
     * weekly_day/weekly_month where the frequency needs them.
     *
     * Split out of nextPayrollDate() and made public so a list endpoint can
     * reuse this exact arithmetic per row: unlike nextPayrollDate(), it touches
     * no database, so calling it once per firm in a paginated loop costs
     * nothing. Callers that want the anchored payroll calendar to win should
     * check PayrollPeriodService first, as nextPayrollDate() does.
     */
    public function payrollDateFromFirmRecord(Firm $firm): ?Carbon
    {
        return match ($firm->payment_type) {
            'Weekly'       => $this->nextWeeklyDate($firm),
            'Bi-Weekly'    => Carbon::now()->addDays(14)->startOfDay(),
            'Semi-Monthly' => $this->nextSemiMonthlyDate(),
            'Monthly'      => Carbon::now()->endOfMonth()->startOfDay(),
            'Bi-Monthly'   => $this->nextBiMonthlyDate(),
            'Annual'       => $this->nextAnnualDate($firm) ?? $this->fiscalYearEnd($firm),
            'Quarterly'    => Carbon::now()->endOfQuarter()->startOfDay(),
            default        => null,
        };
    }

    private function nextWeeklyDate(Firm $firm): Carbon
    {
        $today = Carbon::now()->startOfDay();

        if (! $firm->weekly_day) {
            return $today->copy()->addDays(7);
        }

        $targetDow = (int) $firm->weekly_day;
        $diff      = ($targetDow - $today->dayOfWeekIso + 7) % 7;

        return $today->copy()->addDays($diff);
    }

    /**
     * Annual due date from firm->weekly_month (name or 1-12) + firm->weekly_day (1-31).
     * Returns null if either piece is missing/unparseable, so the caller can fall back.
     */
    private function nextAnnualDate(Firm $firm): ?Carbon
    {
        $month = $this->parseMonth($firm->weekly_month);
        $day   = $firm->weekly_day ? (int) $firm->weekly_day : null;

        if (! $month || ! $day) {
            return null;
        }

        $date = Carbon::createFromDate(Carbon::now()->year, $month, $day)->startOfDay();

        if ($date->isPast()) {
            $date->addYear();
        }

        return $date;
    }

    private function parseMonth(?string $value): ?int
    {
        if (! $value) {
            return null;
        }

        if (is_numeric($value)) {
            $month = (int) $value;

            return ($month >= 1 && $month <= 12) ? $month : null;
        }

        try {
            return Carbon::parse($value)->month;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function nextSemiMonthlyDate(): Carbon
    {
        $today = Carbon::now();

        return $today->day <= 15
            ? $today->copy()->day(15)->startOfDay()
            : $today->copy()->endOfMonth()->startOfDay();
    }

    private function nextBiMonthlyDate(): Carbon
    {
        $today       = Carbon::now();
        $targetMonth = $today->month % 2 === 0 ? $today->month : $today->month + 1;

        return Carbon::createFromDate($today->year, $targetMonth, 1)->endOfMonth()->startOfDay();
    }
}
