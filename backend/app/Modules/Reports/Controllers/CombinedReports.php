<?php

namespace App\Modules\Reports\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\File;
use Validator;

use App\Http\Controllers\BaseController;
use App\Modules\Reports\Models\BalanceSheetCategory;
use App\Modules\Reports\Models\BalanceSheetReport;
use App\Modules\Reports\Models\BalanceSheetRow;
use App\Modules\Reports\Models\CombinedReportSummary;
use App\Modules\Reports\Models\CombinedReportTrend;
use App\Modules\Reports\Models\ProfitLossCategory;
use App\Modules\Reports\Models\ProfitLossReport;
use App\Modules\Reports\Models\ProfitLossRow;

class CombinedReports extends BaseController
{
    /**
     * Maps the fixed labels used in the sample CSV to the columns they
     * populate on combined_report_summaries. Kept in one place since both
     * sampleCsv() (labels/order) and upload() (parsing) must agree with it.
     */
    private const FIELD_LABEL_MAP = [
        'operating revenue'      => 'operating_revenue',
        'non-operating revenues' => 'non_operating_revenues',
        'other adjustments'      => 'other_adjustments',
        'gross profit'           => 'gross_profit',
        'fixed expenses'         => 'fixed_expenses',
        'other expenses'         => 'other_expenses',
        'variable expenses'      => 'variable_expenses',
        'total expenses'         => 'total_expenses',
        'net profit'             => 'net_profit',
        'cash and banks'         => 'cash_and_banks',
        'account receivable'     => 'account_receivable',
        'inventory'              => 'inventory',
        'equipment'              => 'equipment',
        'total assets'           => 'total_assets',
        'account payable'        => 'account_payable',
        'loans payable'          => 'loans_payable',
        'account expenses'       => 'account_expenses',
        'total liabilities'      => 'total_liabilities',
        'total equity'           => 'total_equity',
    ];

    private const DATE_FIELDS = ['from_date', 'to_date', 'as_at_date'];

    public function sampleCsv()
    {
        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="combined_report_sample.csv"',
            'Cache-Control'       => 'no-store',
        ];

        $trendYears              = range((int) now()->format('Y'), (int) now()->format('Y') - 5);
        $netProfitTrendAmounts   = [122000, 122000, 110000, 100000, 99000, 99000];
        $netExpensesTrendAmounts = [83000, 86000, 84000, 85000, 84000, 85000];

        $rows = [
            ['DO NOT CHANGE THE LABELS AS THEY WILL NOT GET SAVED. UPDATE ONLY THE DATES AND AMOUNT', ''],
            ['P&L', ''],
            ['from_date', now()->startOfYear()->format('n/j/Y')],
            ['to_date',   now()->format('n/j/Y')],
            ['Revenue Summary', ''],
            ['Operating Revenue', 100500],
            ['Non-Operating Revenues', 10000],
            ['Other Adjustments', 11500],
            ['Gross Profit', 122000],
            ['Expenses', ''],
            ['Fixed Expenses', 80000],
            ['Other Expenses', 1000],
            ['Variable Expenses', 2000],
            ['Total Expenses', 83000],
            ['Net Profit', 39000],
            ['Net Profit Trend', ''],
        ];

        foreach ($trendYears as $i => $year) {
            $rows[] = [$year, $netProfitTrendAmounts[$i]];
        }

        $rows[] = ['Net Expenses Trend', ''];
        foreach ($trendYears as $i => $year) {
            $rows[] = [$year, $netExpensesTrendAmounts[$i]];
        }

        array_push(
            $rows,
            ['BS Summary', ''],
            ['as_at_date', now()->format('n/j/Y')],
            ['Assets', ''],
            ['Cash and Banks', 350],
            ['Account Receivable', 350],
            ['Inventory', 350],
            ['Equipment', 350],
            ['Total Assets', 4250],
            ['Liabilities', ''],
            ['Account Payable', 148.43],
            ['Loans Payable', 12],
            ['Account Expenses', 12],
            ['Total Liabilities', 1258],
            ['Total Equity', 2992],
        );

        $callback = function () use ($rows) {
            $handle = fopen('php://output', 'w');
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Upload the fixed-format combined summary CSV (see sampleCsv() for the
     * exact labels expected). Creates one CombinedReportSummary row plus its
     * Net Profit / Net Expenses trend rows.
     */
    public function upload(Request $request)
    {
        $rules = [
            'file'            => ['required', File::types(['csv', 'txt'])->max(10240)],
            'organization_id' => ['required', 'integer', 'exists:firms,id'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        if (! $this->authorizeFirmScope($validated['organization_id'], 'firms.manage', null, blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $file   = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');

        $fields         = [];
        $trends         = ['net_profit' => [], 'net_expenses' => []];
        $currentSection = null;
        $isFirstLine    = true;

        while (($line = fgetcsv($handle, null, ',', '"', '\\')) !== false) {
            if ($isFirstLine) {
                $isFirstLine = false;
                continue;
            }

            $label = isset($line[0]) ? trim((string) $line[0]) : '';
            $value = isset($line[1]) ? trim((string) $line[1]) : '';

            if ($label === '') {
                continue;
            }

            $normalized = strtolower($label);

            if ($value === '') {
                $currentSection = $normalized;
                continue;
            }

            if (in_array($currentSection, ['net profit trend', 'net expenses trend'], true) && preg_match('/^\d{4}$/', $label)) {
                $trendType                        = $currentSection === 'net profit trend' ? 'net_profit' : 'net_expenses';
                $trends[$trendType][(int) $label] = $value;
                continue;
            }

            if (in_array($normalized, self::DATE_FIELDS, true)) {
                $fields[$normalized] = $value;
                continue;
            }

            if (isset(self::FIELD_LABEL_MAP[$normalized])) {
                $fields[self::FIELD_LABEL_MAP[$normalized]] = $value;
            }
        }
        fclose($handle);

        $requiredFields = array_merge(self::DATE_FIELDS, array_values(self::FIELD_LABEL_MAP));
        $missing        = array_diff($requiredFields, array_keys($fields));
        if (!empty($missing)) {
            return $this->sendError('CSV_MISSING_LABELS: ' . implode(', ', $missing));
        }

        if (empty($trends['net_profit']) || empty($trends['net_expenses'])) {
            return $this->sendError('CSV_MISSING_TREND_DATA');
        }

        foreach ($trends as $trendType => $years) {
            foreach ($years as $year => $amount) {
                if (!is_numeric($amount)) {
                    return $this->sendError("CSV_INVALID_TREND_AMOUNT: {$trendType} {$year}");
                }
            }
        }

        foreach (self::DATE_FIELDS as $dateField) {
            $parsed = $this->parseSampleDate($fields[$dateField]);
            if ($parsed === null) {
                return $this->sendError("CSV_INVALID_DATE: {$dateField}");
            }
            $fields[$dateField] = $parsed;
        }

        $numericRules  = array_fill_keys(array_values(self::FIELD_LABEL_MAP), ['required', 'numeric']);
        $metaValidator = Validator::make($fields, array_merge($numericRules, [
            'from_date'  => ['required', 'date'],
            'to_date'    => ['required', 'date', 'after_or_equal:from_date'],
            'as_at_date' => ['required', 'date'],
        ]));
        if ($metaValidator->fails()) {
            return $this->sendError($metaValidator->errors());
        }
        $fields = $metaValidator->validated();

        $result = DB::transaction(function () use ($fields, $trends, $validated) {
            $summary = CombinedReportSummary::create(array_merge($fields, [
                'organization_id' => $validated['organization_id'],
            ]));

            foreach ($trends as $trendType => $years) {
                foreach ($years as $year => $amount) {
                    CombinedReportTrend::create([
                        'report_id'  => $summary->id,
                        'trend_type' => $trendType,
                        'year'       => $year,
                        'amount'     => (float) $amount,
                    ]);
                }
            }

            // Also populate the real profit_loss_*/balance_sheet_* tables so the
            // existing P&L/BS preview screens and trend charts (which read those
            // tables directly, not combined_report_summaries) reflect this upload.
            $profitLossReport   = $this->buildProfitLossReport($fields, $validated['organization_id']);
            $balanceSheetReport = $this->buildBalanceSheetReport($fields, $validated['organization_id']);

            $currentYear = (int) Carbon::parse($fields['from_date'])->format('Y');
            $this->backfillTrendReports($trends, $validated['organization_id'], $currentYear);

            return [
                'combined_report'      => $summary->load('trends'),
                'profit_loss_report'   => $profitLossReport->load('rows.category'),
                'balance_sheet_report' => $balanceSheetReport->load('rows.category'),
            ];
        });

        return $this->sendResponse('REPORT_UPLOADED', $result);
    }

    /**
     * Creates the current-period ProfitLossReport + rows. Category names are
     * distinct per bucket (not a shared "Income"/"Expenses" category) so that
     * ProfitLoss::previewProfitLoss()'s substring-based bucketing assigns each
     * row back to the correct figure; the 'Net Profit' label is required
     * verbatim for ProfitLoss::netIncomeTrend()'s `LIKE '%net%'` match.
     */
    private function buildProfitLossReport(array $fields, int $organizationId): ProfitLossReport
    {
        $report = ProfitLossReport::create([
            'organization_id' => $organizationId,
            'source'          => 'combined_upload',
            'report_name'     => 'Combined Report',
            'currency'        => 'CAD',
            'from_date'       => $fields['from_date'],
            'to_date'         => $fields['to_date'],
        ]);

        $this->insertRows(ProfitLossRow::class, ProfitLossCategory::class, $report->id, [
            ['section_header', 'Income', '', 'income', null],
            ['data',           'Operating Revenue',       'Operating Revenue',       'income', $fields['operating_revenue']],
            ['data',           'Non-Operating Revenues',  'Non-Operating Revenues',  'income', $fields['non_operating_revenues']],
            ['data',           'Other Adjustments',       'Other Adjustments',       'income', $fields['other_adjustments']],
            ['total',          'Gross Profit',            'Gross Profit',            'total',  $fields['gross_profit']],
            ['section_header', 'Expenses', '', 'expense', null],
            ['data',           'Fixed Expenses',          'Fixed Expenses',          'expense', $fields['fixed_expenses']],
            ['data',           'Variable Expenses',       'Variable Expenses',       'expense', $fields['variable_expenses']],
            ['data',           'Other Expenses',          'Other Expenses',          'expense', $fields['other_expenses']],
            ['total',          'Total Expenses',          '',                        'expense', $fields['total_expenses']],
            ['total',          'Net Profit',              'Net Profit',              'total',  $fields['net_profit']],
        ]);

        return $report;
    }

    /**
     * Creates the current-period BalanceSheetReport + rows, matching the exact
     * section_header -> data* -> total shape BalanceSheet::preview() expects
     * (see BalanceSheet::sampleCsv() for the reference layout).
     */
    private function buildBalanceSheetReport(array $fields, int $organizationId): BalanceSheetReport
    {
        $report = BalanceSheetReport::create([
            'organization_id' => $organizationId,
            'source'          => 'combined_upload',
            'report_name'     => 'Combined Report',
            'currency'        => 'CAD',
            'as_at_date'      => $fields['as_at_date'],
        ]);

        $this->insertRows(BalanceSheetRow::class, BalanceSheetCategory::class, $report->id, [
            ['section_header', 'Assets', '', 'asset', null],
            ['data',           'Cash and Banks',     'Assets', 'asset', $fields['cash_and_banks']],
            ['data',           'Account Receivable', 'Assets', 'asset', $fields['account_receivable']],
            ['data',           'Inventory',          'Assets', 'asset', $fields['inventory']],
            ['data',           'Equipment',          'Assets', 'asset', $fields['equipment']],
            ['total',          'Total Assets',       '',       'asset', $fields['total_assets']],
            ['section_header', 'Liabilities', '', 'liability', null],
            ['data',           'Account Payable',    'Liabilities', 'liability', $fields['account_payable']],
            ['data',           'Loans Payable',       'Liabilities', 'liability', $fields['loans_payable']],
            ['data',           'Account Expenses',    'Liabilities', 'liability', $fields['account_expenses']],
            ['total',          'Total Liabilities',  '',            'liability', $fields['total_liabilities']],
            ['total',          'Total Equity',        '',            'equity',   $fields['total_equity']],
        ]);

        return $report;
    }

    /**
     * ProfitLoss::netIncomeTrend()/netExpensesTrend() sum profit_loss_rows
     * across every report for the org grouped by YEAR(from_date), so each
     * combined upload backfills one lightweight ProfitLossReport per
     * historical trend year (skipping the current period's own year, which is
     * already covered by buildProfitLossReport()). These are tagged with a
     * distinct source so re-uploading replaces rather than accumulates them.
     */
    private function backfillTrendReports(array $trends, int $organizationId, int $currentYear): void
    {
        ProfitLossReport::where('organization_id', $organizationId)
            ->where('source', 'combined_csv_trend_backfill')
            ->delete();

        $years = array_unique(array_merge(array_keys($trends['net_profit']), array_keys($trends['net_expenses'])));

        foreach ($years as $year) {
            if ($year === $currentYear) {
                continue;
            }

            $report = ProfitLossReport::create([
                'organization_id' => $organizationId,
                'source'          => 'combined_csv_trend_backfill',
                'report_name'     => "Combined Report Trend Backfill {$year}",
                'currency'        => 'CAD',
                'from_date'       => "{$year}-01-01",
                'to_date'         => "{$year}-12-31",
            ]);

            $rows = [];
            if (isset($trends['net_profit'][$year])) {
                $rows[] = ['total', 'Net Profit', 'Net Profit', 'total', (float) $trends['net_profit'][$year]];
            }
            if (isset($trends['net_expenses'][$year])) {
                $rows[] = ['data', 'Total Expenses', 'Total Expenses', 'expense', (float) $trends['net_expenses'][$year]];
            }

            $this->insertRows(ProfitLossRow::class, ProfitLossCategory::class, $report->id, $rows);
        }
    }

    /**
     * Shared row/category insertion for the combined-report builders above.
     * parent_id is always null: none of the consuming endpoints
     * (previewProfitLoss, netIncomeTrend, netExpensesTrend, BalanceSheet::preview)
     * read row hierarchy, only row_type/category/label/amount.
     */
    private function insertRows(string $rowModel, string $categoryModel, int $reportId, array $rows): void
    {
        $categoryCache = [];

        foreach ($rows as $sortIndex => [$rowType, $label, $categoryName, $categoryType, $amount]) {
            $categoryId = null;

            if ($categoryName !== '') {
                $cacheKey = strtolower($categoryName . '|' . $categoryType);
                if (!isset($categoryCache[$cacheKey])) {
                    $category = $categoryModel::firstOrCreate(
                        ['name' => $categoryName, 'type' => $categoryType],
                        ['name' => $categoryName, 'type' => $categoryType]
                    );
                    $categoryCache[$cacheKey] = $category->id;
                }
                $categoryId = $categoryCache[$cacheKey];
            }

            $rowModel::create([
                'report_id'   => $reportId,
                'category_id' => $categoryId,
                'parent_id'   => null,
                'label'       => $label,
                'row_type'    => $rowType,
                'amount'      => $amount !== null ? (float) $amount : null,
                'sort_order'  => $sortIndex + 1,
                'level_depth' => $rowType === 'data' ? 1 : 0,
                'meta_json'   => null,
            ]);
        }
    }

    /**
     * The sample CSV uses M/D/Y dates (e.g. "1/1/2026"), but spreadsheet tools
     * frequently re-save these with inconsistent zero-padding (e.g. "8/03/2026")
     * or, depending on regional settings, as D/M/Y (e.g. "15/08/2026"). Carbon's
     * createFromFormat/hasFormat enforce padding per-specifier ('n' rejects a
     * leading zero, 'm' requires one), so a fixed format list rejects mixed
     * padding outright. Parse the numeric components directly instead, and only
     * fall back to D/M/Y when the first number can't be a valid month.
     */
    private function parseSampleDate(string $value): ?string
    {
        $value = trim($value);

        if (Carbon::hasFormat($value, 'Y-m-d')) {
            return Carbon::createFromFormat('Y-m-d', $value)->format('Y-m-d');
        }

        if (!preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $value, $matches)) {
            return null;
        }

        [, $first, $second, $year] = $matches;
        $first  = (int) $first;
        $second = (int) $second;
        $year   = (int) $year;

        if ($first >= 1 && $first <= 12 && checkdate($first, $second, $year)) {
            [$month, $day] = [$first, $second];
        } elseif ($second >= 1 && $second <= 12 && checkdate($second, $first, $year)) {
            [$month, $day] = [$second, $first];
        } else {
            return null;
        }

        return sprintf('%04d-%02d-%02d', $year, $month, $day);
    }
}
