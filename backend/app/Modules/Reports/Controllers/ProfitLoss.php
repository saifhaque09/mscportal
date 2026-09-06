<?php

namespace App\Modules\Reports\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rules\File;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Validator;

use App\Http\Controllers\BaseController;
use App\Modules\Clients\Models\Firm;
use App\Modules\Files\Controllers\Files;
use App\Modules\Reports\Models\ProfitLossCategory;
use App\Modules\Reports\Models\ProfitLossReport;
use App\Modules\Reports\Models\ProfitLossRow;
use App\Modules\Reports\Models\ReportDocument;

class ProfitLoss extends BaseController
{
    public function sampleCsv()
    {
        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="profit_loss_sample.csv"',
            'Cache-Control'       => 'no-store',
        ];

        $rows = [
            ['report_name', 'Sample Annual P&L'],
            ['source',      'manual_upload'],
            ['currency',    'USD'],
            ['from_date',   now()->startOfYear()->format('Y-m-d')],
            ['to_date',     now()->format('Y-m-d')],
            ['label', 'category_name', 'category_type', 'row_type', 'amount', 'sort_order', 'level_depth', 'meta_json'],
            ['Income',           '',             'income',  'section_header', '',          1,  0, ''],
            ['Revenue',          'Income',       'income',  'data',           '100000.00', 2,  1, ''],
            ['Other Income',     'Income',       'income',  'data',           '5000.00',   3,  1, ''],
            ['Total Income',     '',             'income',  'total',          '105000.00', 4,  0, ''],
            ['Expenses',         '',             'expense', 'section_header', '',          5,  0, ''],
            ['Salaries',         'Expenses',     'expense', 'data',           '50000.00',  6,  1, ''],
            ['Rent',             'Expenses',     'expense', 'data',           '10000.00',  7,  1, ''],
            ['Total Expenses',   '',             'expense', 'total',          '60000.00',  8,  0, ''],
            ['Gross Profit',     'Gross Profit', 'total',   'total',          '45000.00',  9,  0, ''],
            ['Net Profit',       'Net Profit',   'Total',   'total',          '45000.00',  10, 0, ''],
        ];

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
     * Upload a P&L CSV and persist all three tables.
     *
     * Expected CSV columns (header row required):
     *   label, category_name, category_type, row_type, amount, sort_order, level_depth, meta_json
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

        // Parse CSV
        $file   = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');

        // Leading "key,value" rows (report_name/source/currency/from_date/to_date) let
        // the CSV carry its own report metadata when the request body doesn't supply it.
        $metaKeys = ['report_name', 'source', 'currency', 'from_date', 'to_date'];
        $metadata = [];
        $headers  = null;
        while (($line = fgetcsv($handle, null, ',', '"', '\\')) !== false) {
            $key = isset($line[0]) ? strtolower(trim($line[0])) : '';
            if (count($line) >= 2 && in_array($key, $metaKeys, true)) {
                $metadata[$key] = trim($line[1]);
                continue;
            }
            $headers = $line;
            break;
        }

        if (! $headers) {
            fclose($handle);
            return $this->sendError('CSV_EMPTY_OR_INVALID');
        }

        $headers = array_map('trim', $headers);
        $required = ['label', 'category_name', 'category_type', 'row_type'];
        $missing  = array_diff($required, $headers);
        if (! empty($missing)) {
            fclose($handle);
            return $this->sendError('CSV_MISSING_COLUMNS');
        }

        // Request body values take precedence over CSV metadata when both are present.
        $reportMeta = array_merge($metadata, array_filter($request->only($metaKeys)));

        $metaValidator = Validator::make($reportMeta, [
            'source'      => ['required', 'string', 'max:100'],
            'report_name' => ['required', 'string', 'max:255'],
            'currency'    => ['required', 'string', 'max:10'],
            'from_date'   => ['required', 'date', 'date_format:Y-m-d'],
            'to_date'     => ['required', 'date', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);
        if ($metaValidator->fails()) {
            fclose($handle);
            return $this->sendError($metaValidator->errors());
        }
        $reportMeta = $metaValidator->validated();

        $rows = [];
        while (($line = fgetcsv($handle, null, ',', '"', '\\')) !== false) {
            if (count($line) !== count($headers)) {
                continue;
            }
            $rows[] = array_combine($headers, array_map('trim', $line));
        }
        fclose($handle);

        if (empty($rows)) {
            return $this->sendError('CSV_NO_DATA_ROWS');
        }

        // Create the report header
        $report = ProfitLossReport::create([
            'organization_id' => $validated['organization_id'],
            'source'          => $reportMeta['source'],
            'report_name'     => $reportMeta['report_name'],
            'currency'        => $reportMeta['currency'],
            'from_date'       => $reportMeta['from_date'],
            'to_date'         => $reportMeta['to_date'],
        ]);

        // Category cache: "name|type" -> id
        $categoryCache = [];

        // Parent resolution: level_depth -> last inserted row id at that depth
        $parentStack = [];

        foreach ($rows as $sortIndex => $row) {
            $categoryId = null;
            $catName    = $row['category_name'] ?? '';
            $catType    = $row['category_type'] ?? '';

            if ($catName !== '' && $catType !== '') {
                $cacheKey = strtolower($catName . '|' . $catType);
                if (! isset($categoryCache[$cacheKey])) {
                    $category = ProfitLossCategory::firstOrCreate(
                        ['name' => $catName, 'type' => $catType],
                        ['name' => $catName, 'type' => $catType]
                    );
                    $categoryCache[$cacheKey] = $category->id;
                }
                $categoryId = $categoryCache[$cacheKey];
            }

            $depth      = isset($row['level_depth']) && $row['level_depth'] !== '' ? (int) $row['level_depth'] : 0;
            $sortOrder  = isset($row['sort_order'])  && $row['sort_order']  !== '' ? (int) $row['sort_order']  : $sortIndex + 1;
            $amount     = isset($row['amount'])      && $row['amount']      !== '' ? (float) $row['amount']    : null;
            $metaRaw    = $row['meta_json'] ?? '';
            $meta       = ($metaRaw !== '') ? json_decode($metaRaw, true) : null;

            // Resolve parent: the last row inserted at depth - 1
            $parentId = ($depth > 0 && isset($parentStack[$depth - 1])) ? $parentStack[$depth - 1] : null;

            $inserted = ProfitLossRow::create([
                'report_id'   => $report->id,
                'category_id' => $categoryId,
                'parent_id'   => $parentId,
                'label'       => $row['label'],
                'row_type'    => $row['row_type'],
                'amount'      => $amount,
                'sort_order'  => $sortOrder,
                'level_depth' => $depth,
                'meta_json'   => $meta,
            ]);

            $parentStack[$depth] = $inserted->id;

            // Clear any deeper levels from the stack
            foreach (array_keys($parentStack) as $d) {
                if ($d > $depth) {
                    unset($parentStack[$d]);
                }
            }
        }

        $report->load('rows.category');

        return $this->sendResponse('REPORT_UPLOADED', $report);
    }

    /**
     * Shared helper: resolve report IDs + currency for a given org + date filters.
     */
    private function resolveReports(array $validated): array
    {
        $q = ProfitLossReport::where('organization_id', $validated['organization_id']);

        if (! empty($validated['year'])) {
            $q->whereYear('from_date', $validated['year']);
        }
        if (! empty($validated['from_date'])) {
            $q->where('from_date', '>=', $validated['from_date']);
        }
        if (! empty($validated['to_date'])) {
            $q->where('to_date', '<=', $validated['to_date']);
        }

        $reports = $q->orderByDesc('from_date')->get(['id', 'currency']);

        return [
            'ids'      => $reports->pluck('id'),
            'currency' => $reports->first()?->currency ?? 'CAD',
        ];
    }

    /**
     * Group profit_loss_rows by category name via category_id join and sum amounts.
     * Returns a keyed collection: [ 'Category Name' => total_amount ]
     */
    private function sumByCategory(array $reportIds, string $categoryType): \Illuminate\Support\Collection
    {
        return DB::table('profit_loss_rows as r')
            ->join('profit_loss_categories as c', 'r.category_id', '=', 'c.id')
            ->whereIn('r.report_id', $reportIds)
            ->where('r.row_type', 'data')
            ->whereNotNull('r.amount')
            ->where('c.type', $categoryType)
            ->select('c.name', DB::raw('SUM(ABS(r.amount)) as total'))
            ->groupBy('c.name')
            ->get()
            ->pluck('total', 'name');
    }

    /**
     * POST /api/reports/profit-loss/net-income-trend
     * Returns net income per year for the last 6 years (bar chart data).
     * end_year defaults to the current year.
     */
    /**
     * Upload a P&L PDF as-is — no parsing, no rows/categories inserted.
     * Just stores the file and links it to the firm as a "profit_loss" report document.
     */
    public function uploadPdf(Request $request)
    {
        $rules = [
            'file'            => ['required', File::types(['pdf'])->max(Config::get('files.max_upload_size'))],
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

        $firm = Firm::find($validated['organization_id']);

        $uploadedFile = $request->file('file');
        $extension    = $uploadedFile->extension();
        $name         = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
        $file_name    = Str::slug($name) . '.' . $extension;
        $path         = 'reports/' . $firm->guid . '/profit_loss';

        $data = (new Files())->store($request, $uploadedFile, 'document', $file_name, $path);

        $document = ReportDocument::create([
            'organization_id' => $firm->id,
            'report_type'     => 'profit_loss',
            'file_id'         => $data['file_id'],
            'created_by'      => auth()->id(),
        ]);

        return $this->sendResponse('FILE_UPLOADED', [
            'id'         => $document->id,
            'file_id'    => $data['file_id'],
            'file_url'   => $data['file_url'],
            'file_name'  => $data['file_name'],
            'created_at' => $document->created_at,
        ]);
    }

    /**
     * Return a fresh signed preview URL for the organization's most recently
     * uploaded P&L PDF. The file_url returned by uploadPdf() expires after
     * 10 minutes and isn't stored anywhere, so this re-signs a new one on
     * demand from the report_documents/files records instead.
     */
    public function fileUrl(Request $request)
    {
        $rules = [
            'guid' => ['required', 'string', 'exists:firms,guid'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();
        $firm      = Firm::where('guid', $validated['guid'])->first();

        if (! $this->authorizeFirmScope($firm->id, 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $document = ReportDocument::where('organization_id', $firm->id)
            ->where('report_type', 'profit_loss')
            ->with('file:id,file_name')
            ->latest()
            ->first();

        if (!$document || !$document->file) {
            return $this->sendError('NO_RECORDS_FOUND', 200);
        }

        $file_url = URL::temporarySignedRoute(
            'files.stream',
            now()->addMinutes(10),
            ['file_id' => $document->file_id, 'uid' => auth()->id()]
        );

        return $this->sendResponse('RECORDS_FOUND', [
            'id'         => $document->id,
            'file_id'    => $document->file_id,
            'file_url'   => $file_url,
            'file_name'  => $document->file->file_name,
            'created_at' => $document->created_at,
        ]);
    }

    public function netIncomeTrend(Request $request)
    {
        $rules = [
            'organization_id' => ['required', 'integer', 'exists:firms,id'],
            'end_year'        => ['nullable', 'integer', 'digits:4', 'min:2000', 'max:2100'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        if (! $this->authorizeFirmScope($validated['organization_id'], 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $endYear   = $validated['end_year'] ?? (int) now()->format('Y');
        $startYear = $endYear - 5;

        // For each year, sum net-row amounts from all reports in that year
        $rows = DB::table('profit_loss_rows as r')
            ->join('profit_loss_reports as p', 'r.report_id', '=', 'p.id')
            ->where('p.organization_id', $validated['organization_id'])
            ->where('r.row_type', 'total')
            ->whereRaw('LOWER(r.label) LIKE ?', ['%net%'])
            ->whereNotNull('r.amount')
            ->whereBetween(DB::raw('YEAR(p.from_date)'), [$startYear, $endYear])
            ->select(DB::raw('YEAR(p.from_date) as year'), DB::raw('SUM(r.amount) as net_income'))
            ->groupBy(DB::raw('YEAR(p.from_date)'))
            ->get()
            ->keyBy('year');

        $currency = ProfitLossReport::where('organization_id', $validated['organization_id'])
            ->whereBetween(DB::raw('YEAR(from_date)'), [$startYear, $endYear])
            ->orderByDesc('from_date')
            ->value('currency') ?? 'CAD';

        $bars = [];
        for ($year = $startYear; $year <= $endYear; $year++) {
            $bars[] = [
                'year'       => $year,
                'net_income' => isset($rows[$year]) ? round((float) $rows[$year]->net_income, 2) : 0.0,
            ];
        }

        return $this->sendResponse('RECORDS_FOUND', [
            'title'    => 'Net Income Trend',
            'currency' => $currency,
            'bars'     => $bars,
        ]);
    }

    /**
     * POST /api/reports/profit-loss/preview
     * Returns the flat set of P&L figures shown on the preview screen.
     */
    public function previewProfitLoss(Request $request)
    {
        $rules = [
            'organization_id' => ['required', 'integer', 'exists:firms,id'],
            'from_date'       => ['nullable', 'date', 'date_format:Y-m-d'],
            'to_date'         => ['nullable', 'date', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        if (! $this->authorizeFirmScope($validated['organization_id'], 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $query = ProfitLossReport::with(['organization'])
            ->where('organization_id', $validated['organization_id']);

        if (!empty($validated['from_date'])) {
            $query->where('from_date', '>=', $validated['from_date']);
        }
        if (!empty($validated['to_date'])) {
            $query->where('to_date', '<=', $validated['to_date']);
        }

        $report = $query->orderByDesc('from_date')->first();

        if (!$report) {
            return $this->sendError('NO_RECORDS_FOUND', 200);
        }

        // Same category-bucket logic used by the income/expense chart endpoints,
        // scoped to this single report, so the preview figures always match the charts.
        $incomeByName  = $this->sumByCategory([$report->id], 'income');
        $expenseByName = $this->sumByCategory([$report->id], 'expense');

        $operatingRevenues    = 0.0;
        $nonOperatingRevenues = 0.0;
        $otherAdjustments     = 0.0;
        $lessCostOfGoodSold   = 0.0;

        foreach ($incomeByName as $name => $total) {
            $n = strtolower($name);
            if (str_contains($n, 'cost of good') || str_contains($n, 'cogs')) {
                $lessCostOfGoodSold += (float) $total;
            } elseif (str_contains($n, 'non-operating') || str_contains($n, 'non operating')) {
                $nonOperatingRevenues += (float) $total;
            } elseif (str_contains($n, 'adjustment')) {
                $otherAdjustments += (float) $total;
            } else {
                $operatingRevenues += (float) $total;
            }
        }

        $fixExpenses      = 0.0;
        $variableExpenses = 0.0;
        $otherExpenses    = 0.0;

        foreach ($expenseByName as $name => $total) {
            $n = strtolower($name);
            if (str_contains($n, 'fix') || str_contains($n, 'fixed')) {
                $fixExpenses += (float) $total;
            } elseif (str_contains($n, 'variable') || str_contains($n, 'var ')) {
                $variableExpenses += (float) $total;
            } else {
                $otherExpenses += (float) $total;
            }
        }

        $grossProfit   = $operatingRevenues + $nonOperatingRevenues + $otherAdjustments - $lessCostOfGoodSold;
        $totalExpenses = $fixExpenses + $variableExpenses + $otherExpenses;
        $newProfit     = $grossProfit - $totalExpenses;

        return $this->sendResponse('RECORDS_FOUND', [
            'report_name'            => $report->report_name,
            'firm_name'              => $report->organization->firm_name ?? null,
            'from_date'              => $report->from_date->format('M j, Y'),
            'to_date'                => $report->to_date->format('M j, Y'),
            'currency'               => $report->currency,
            'operating_revenues'     => round($operatingRevenues, 2),
            'non_operating_revenues' => round($nonOperatingRevenues, 2),
            'other_adjustments'      => round($otherAdjustments, 2),
            'less_cost_of_good_sold' => round($lessCostOfGoodSold, 2),
            'gross_profit'           => round($grossProfit, 2),
            'fix_expenses'           => round($fixExpenses, 2),
            'variable_expenses'      => round($variableExpenses, 2),
            'other_expenses'         => round($otherExpenses, 2),
            'total_expenses'         => round($totalExpenses, 2),
            'new_profit'             => round($newProfit, 2),
        ]);
    }

    /**
     * POST /api/reports/profit-loss/net-expenses-trend
     * Returns total expenses per year for the last 6 years (bar chart data).
     */
    public function netExpensesTrend(Request $request)
    {
        $rules = [
            'organization_id' => ['required', 'integer', 'exists:firms,id'],
            'end_year'        => ['nullable', 'integer', 'digits:4', 'min:2000', 'max:2100'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        if (! $this->authorizeFirmScope($validated['organization_id'], 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $endYear   = $validated['end_year'] ?? (int) now()->format('Y');
        $startYear = $endYear - 5;

        $rows = DB::table('profit_loss_rows as r')
            ->join('profit_loss_reports as p', 'r.report_id', '=', 'p.id')
            ->join('profit_loss_categories as c', 'r.category_id', '=', 'c.id')
            ->where('p.organization_id', $validated['organization_id'])
            ->where('r.row_type', 'data')
            ->where('c.type', 'expense')
            ->whereNotNull('r.amount')
            ->whereBetween(DB::raw('YEAR(p.from_date)'), [$startYear, $endYear])
            ->select(DB::raw('YEAR(p.from_date) as year'), DB::raw('SUM(ABS(r.amount)) as net_expenses'))
            ->groupBy(DB::raw('YEAR(p.from_date)'))
            ->get()
            ->keyBy('year');

        $currency = ProfitLossReport::where('organization_id', $validated['organization_id'])
            ->whereBetween(DB::raw('YEAR(from_date)'), [$startYear, $endYear])
            ->orderByDesc('from_date')
            ->value('currency') ?? 'CAD';

        $bars = [];
        for ($year = $startYear; $year <= $endYear; $year++) {
            $bars[] = [
                'year'         => $year,
                'net_expenses' => isset($rows[$year]) ? round((float) $rows[$year]->net_expenses, 2) : 0.0,
            ];
        }

        return $this->sendResponse('RECORDS_FOUND', [
            'title'    => 'Net Expenses Trend',
            'currency' => $currency,
            'bars'     => $bars,
        ]);
    }

    /**
     * POST /api/reports/profit-loss/net-income-chart
     * Returns Operating Revenues, Non-Operating Revenue, and Other Adjustments
     * as amounts + percentages for a pie/donut chart.
     */
    public function netIncomeChart(Request $request)
    {
        $rules = [
            'organization_id' => ['required', 'integer', 'exists:firms,id'],
            'year'            => ['nullable', 'integer', 'digits:4', 'min:2000', 'max:2100'],
            'from_date'       => ['nullable', 'date', 'date_format:Y-m-d'],
            'to_date'         => ['nullable', 'date', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        if (! $this->authorizeFirmScope($validated['organization_id'], 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $resolved  = $this->resolveReports($validated);

        if ($resolved['ids']->isEmpty()) {
            return $this->sendError('NO_RECORDS_FOUND', 200);
        }

        // Group by profit_loss_categories.name where type = 'income'
        $byName = $this->sumByCategory($resolved['ids']->toArray(), 'income');

        // Map category names → three fixed chart segments
        $buckets = [
            'Operating Revenues'     => 0.0,
            'Non-Operating Revenues' => 0.0,
            'Other Adjustments'      => 0.0,
        ];

        foreach ($byName as $name => $total) {
            $n = strtolower($name);
            if (str_contains($n, 'non-operating') || str_contains($n, 'non operating')) {
                $buckets['Non-Operating Revenues'] += (float) $total;
            } elseif (str_contains($n, 'adjustment') || str_contains($n, 'other adjustment')) {
                $buckets['Other Adjustments'] += (float) $total;
            } else {
                $buckets['Operating Revenues'] += (float) $total;
            }
        }

        $grand = array_sum($buckets);

        if ($grand <= 0) {
            return $this->sendError('NO_RECORDS_FOUND', 200);
        }

        $colors = [
            'Operating Revenues'     => '#2e7d6e',
            'Non-Operating Revenues' => '#d4a84b',
            'Other Adjustments'      => '#2c3e50',
        ];

        $segments = [];
        foreach ($buckets as $label => $amount) {
            $segments[] = [
                'label'      => $label,
                'amount'     => round($amount, 2),
                'percentage' => round(($amount / $grand) * 100, 2),
                'color'      => $colors[$label],
            ];
        }

        return $this->sendResponse('RECORDS_FOUND', [
            'title'        => 'Net Income Till Date',
            'year'         => $validated['year'] ?? null,
            'currency'     => $resolved['currency'],
            'total_amount' => round($grand, 2),
            'segments'     => $segments,
        ]);
    }

    /**
     * POST /api/reports/profit-loss/expenses-by-category
     * Returns Less Expenses, Fix Expenses, and Variable Expenses
     * as amounts + percentages for a pie/donut chart.
     */
    public function expensesByCategoryChart(Request $request)
    {
        $rules = [
            'organization_id' => ['required', 'integer', 'exists:firms,id'],
            'year'            => ['nullable', 'integer', 'digits:4', 'min:2000', 'max:2100'],
            'from_date'       => ['nullable', 'date', 'date_format:Y-m-d'],
            'to_date'         => ['nullable', 'date', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        if (! $this->authorizeFirmScope($validated['organization_id'], 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $resolved  = $this->resolveReports($validated);

        if ($resolved['ids']->isEmpty()) {
            return $this->sendError('NO_RECORDS_FOUND', 200);
        }

        // Group by profit_loss_categories.name where type = 'expense'
        $byName = $this->sumByCategory($resolved['ids']->toArray(), 'expense');

        // Map category names → three fixed chart segments
        $buckets = [
            'Fix Expenses'      => 0.0,
            'Variable Expenses' => 0.0,
            'Other Expenses'    => 0.0,
        ];

        foreach ($byName as $name => $total) {
            $n = strtolower($name);
            if (str_contains($n, 'fix') || str_contains($n, 'fixed')) {
                $buckets['Fix Expenses'] += (float) $total;
            } elseif (str_contains($n, 'variable') || str_contains($n, 'var ')) {
                $buckets['Variable Expenses'] += (float) $total;
            } else {
                $buckets['Other Expenses'] += (float) $total;
            }
        }

        $grand = array_sum($buckets);

        if ($grand <= 0) {
            return $this->sendError('NO_RECORDS_FOUND', 200);
        }

        $colors = [
            'Fix Expenses'      => '#d4a84b',
            'Variable Expenses' => '#c87150',
            'Other Expenses'    => '#2e7d6e',
        ];

        $segments = [];
        foreach ($buckets as $label => $amount) {
            $segments[] = [
                'label'      => $label,
                'amount'     => round($amount, 2),
                'percentage' => round(($amount / $grand) * 100, 2),
                'color'      => $colors[$label],
            ];
        }

        return $this->sendResponse('RECORDS_FOUND', [
            'title'        => 'Expenses By Category',
            'year'         => $validated['year'] ?? null,
            'currency'     => $resolved['currency'],
            'total_amount' => round($grand, 2),
            'segments'     => $segments,
        ]);
    }
}
