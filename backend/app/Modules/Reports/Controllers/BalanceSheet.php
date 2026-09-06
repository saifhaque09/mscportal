<?php

namespace App\Modules\Reports\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rules\File;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Validator;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Font;

use App\Http\Controllers\BaseController;
use App\Modules\Clients\Models\Firm;
use App\Modules\Files\Controllers\Files;
use App\Modules\Reports\Models\BalanceSheetCategory;
use App\Modules\Reports\Models\BalanceSheetReport;
use App\Modules\Reports\Models\BalanceSheetRow;
use App\Modules\Reports\Models\ReportDocument;

class BalanceSheet extends BaseController
{
    public function sampleExcel()
    {
        $rows = [
            ['label', 'category_name', 'category_type', 'row_type', 'amount', 'sort_order', 'level_depth', 'meta_json'],
            ['Assets',             '',             'asset',     'section_header', '',        1,  0, ''],
            ['Cash and Banks',     'Assets',       'asset',     'data',           350.00,    2,  1, ''],
            ['Account Receivable', 'Assets',       'asset',     'data',           350.00,    3,  1, ''],
            ['Inventory',          'Assets',       'asset',     'data',           350.00,    4,  1, ''],
            ['Equipment',          'Assets',       'asset',     'data',           350.00,    5,  1, ''],
            ['Less Depreciation',  'Assets',       'asset',     'data',           350.00,    6,  1, '{"highlight":"red"}'],
            ['Total Assets',       '',             'asset',     'total',          4250.00,   7,  0, ''],
            ['Liabilities',        '',             'liability', 'section_header', '',        8,  0, ''],
            ['Account Payable',    'Liabilities',  'liability', 'data',           148.43,    9,  1, ''],
            ['Loans Payable',      'Liabilities',  'liability', 'data',           12.00,     10, 1, ''],
            ['Account Expenses',   'Liabilities',  'liability', 'data',           12.00,     11, 1, ''],
            ['Total Liabilities',  '',             'liability', 'total',          1258.00,   12, 0, ''],
            ['Total Equity',       '',             'equity',    'total',          2992.00,   13, 0, ''],
        ];

        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Balance Sheet');

        foreach ($rows as $rowIndex => $rowData) {
            $sheet->fromArray($rowData, null, 'A' . ($rowIndex + 1));
        }

        // Header row styling
        $headerStyle = [
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2563EB']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]],
        ];
        $sheet->getStyle('A1:H1')->applyFromArray($headerStyle);

        // Section header rows (section_header row_type is column D)
        $sectionRows = [2, 9]; // Assets, Liabilities
        foreach ($sectionRows as $r) {
            $sheet->getStyle("A{$r}:H{$r}")->applyFromArray([
                'font' => ['bold' => true],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'EFF6FF']],
            ]);
        }

        // Total rows
        $totalRows = [8, 13, 14]; // Total Assets, Total Liabilities, Total Equity
        foreach ($totalRows as $r) {
            $sheet->getStyle("A{$r}:H{$r}")->applyFromArray([
                'font' => ['bold' => true],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DBEAFE']],
            ]);
        }

        // Amount column: number format
        $sheet->getStyle('E2:E14')->getNumberFormat()->setFormatCode('#,##0.00');

        // Auto-fit column widths
        foreach (range('A', 'H') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer   = new Xlsx($spreadsheet);
        $fileName = 'balance_sheet_sample.xlsx';
        $tempPath = tempnam(sys_get_temp_dir(), 'bs_') . '.xlsx';
        $writer->save($tempPath);

        return response()->download($tempPath, $fileName, [
            'Content-Type'  => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'no-store',
        ])->deleteFileAfterSend(true);
    }

    public function sampleCsv()
    {
        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="balance_sheet_sample.csv"',
            'Cache-Control'       => 'no-store',
        ];

        $rows = [
            ['report_name', 'Sample Q1 Balance Sheet'],
            ['source',      'manual_upload'],
            ['currency',    'USD'],
            ['as_at_date',  now()->format('Y-m-d')],
            ['label', 'category_name', 'category_type', 'row_type', 'amount', 'sort_order', 'level_depth', 'meta_json'],
            ['Assets',             '',          'asset',     'section_header', '',        1,  0, ''],
            ['Cash and Banks',     'Assets',    'asset',     'data',           '350.00',  2,  1, ''],
            ['Account Receivable', 'Assets',    'asset',     'data',           '350.00',  3,  1, ''],
            ['Inventory',          'Assets',    'asset',     'data',           '350.00',  4,  1, ''],
            ['Equipment',          'Assets',    'asset',     'data',           '350.00',  5,  1, ''],
            ['Less Depreciation',  'Assets',    'asset',     'data',           '350.00',  6,  1, '{"highlight":"red"}'],
            ['Total Assets',       '',          'asset',     'total',          '4250.00', 7,  0, ''],
            ['Liabilities',        '',          'liability', 'section_header', '',        8,  0, ''],
            ['Account Payable',    'Liabilities','liability','data',           '148.43',  9,  1, ''],
            ['Loans Payable',      'Liabilities','liability','data',           '12.00',  10,  1, ''],
            ['Account Expenses',   'Liabilities','liability','data',           '12.00',  11,  1, ''],
            ['Total Liabilities',  '',          'liability', 'total',          '1258.00',12,  0, ''],
            ['Total Equity',       '',          'equity',    'total',          '2992.00',13,  0, ''],
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

        // Leading "key,value" rows (report_name/source/currency/as_at_date) let the
        // CSV carry its own report metadata when the request body doesn't supply it.
        $metaKeys = ['report_name', 'source', 'currency', 'as_at_date'];
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

        if (!$headers) {
            fclose($handle);
            return $this->sendError('CSV_EMPTY_OR_INVALID');
        }

        $headers = array_map('trim', $headers);
        $required = ['label', 'category_name', 'category_type', 'row_type'];
        $missing  = array_diff($required, $headers);
        if (!empty($missing)) {
            fclose($handle);
            return $this->sendError('CSV_MISSING_COLUMNS');
        }

        // Request body values take precedence over CSV metadata when both are present.
        $reportMeta = array_merge($metadata, array_filter($request->only($metaKeys)));

        $metaValidator = Validator::make($reportMeta, [
            'source'      => ['required', 'string', 'max:100'],
            'report_name' => ['required', 'string', 'max:255'],
            'currency'    => ['required', 'string', 'max:10'],
            'as_at_date'  => ['required', 'date', 'date_format:Y-m-d'],
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

        $report = BalanceSheetReport::create([
            'organization_id' => $validated['organization_id'],
            'source'          => $reportMeta['source'],
            'report_name'     => $reportMeta['report_name'],
            'currency'        => $reportMeta['currency'],
            'as_at_date'      => $reportMeta['as_at_date'],
        ]);

        $categoryCache = [];
        $parentStack   = [];

        foreach ($rows as $sortIndex => $row) {
            $categoryId = null;
            $catName    = $row['category_name'] ?? '';
            $catType    = $row['category_type'] ?? '';

            if ($catName !== '' && $catType !== '') {
                $cacheKey = strtolower($catName . '|' . $catType);
                if (!isset($categoryCache[$cacheKey])) {
                    $category = BalanceSheetCategory::firstOrCreate(
                        ['name' => $catName, 'type' => $catType],
                        ['name' => $catName, 'type' => $catType]
                    );
                    $categoryCache[$cacheKey] = $category->id;
                }
                $categoryId = $categoryCache[$cacheKey];
            }

            $depth     = isset($row['level_depth']) && $row['level_depth'] !== '' ? (int) $row['level_depth'] : 0;
            $sortOrder = isset($row['sort_order'])  && $row['sort_order']  !== '' ? (int) $row['sort_order']  : $sortIndex + 1;
            $amount    = isset($row['amount'])       && $row['amount']      !== '' ? (float) $row['amount']   : null;
            $metaRaw   = $row['meta_json'] ?? '';
            $meta      = ($metaRaw !== '') ? json_decode($metaRaw, true) : null;

            $parentId = ($depth > 0 && isset($parentStack[$depth - 1])) ? $parentStack[$depth - 1] : null;

            $inserted = BalanceSheetRow::create([
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
     * Upload a balance sheet PDF as-is — no parsing, no rows/categories inserted.
     * Just stores the file and links it to the firm as a "balance_sheet" report document.
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
        $path         = 'reports/' . $firm->guid . '/balance_sheet';

        $data = (new Files())->store($request, $uploadedFile, 'document', $file_name, $path);

        $document = ReportDocument::create([
            'organization_id' => $firm->id,
            'report_type'     => 'balance_sheet',
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
     * uploaded balance sheet PDF. The file_url returned by uploadPdf() expires
     * after 10 minutes and isn't stored anywhere, so this re-signs a new one
     * on demand from the report_documents/files records instead.
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
            ->where('report_type', 'balance_sheet')
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

    public function preview(Request $request)
    {
        $rules = [
            'organization_id' => ['required', 'integer', 'exists:firms,id'],
            'as_at_date'      => ['nullable', 'date', 'date_format:Y-m-d'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        if (! $this->authorizeFirmScope($validated['organization_id'], 'firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $query = BalanceSheetReport::with(['organization'])
            ->where('organization_id', $validated['organization_id']);

        if (!empty($validated['as_at_date'])) {
            $query->where('as_at_date', $validated['as_at_date']);
        }

        $report = $query->orderByDesc('as_at_date')->first();

        if (!$report) {
            return $this->sendError('NO_RECORDS_FOUND', 200);
        }

        $rows = BalanceSheetRow::where('report_id', $report->id)
            ->orderBy('sort_order')
            ->get(['label', 'row_type', 'amount', 'level_depth', 'meta_json']);

        $sections       = [];
        $currentSection = null;
        $summaries      = [];

        foreach ($rows as $row) {
            if ($row->row_type === 'section_header') {
                if ($currentSection) {
                    $sections[] = $currentSection;
                }
                $currentSection = [
                    'title' => $row->label,
                    'items' => [],
                    'total' => null,
                ];

            } elseif ($row->row_type === 'data') {
                if ($currentSection !== null) {
                    $currentSection['items'][] = [
                        'label'    => $row->label,
                        'amount'   => $row->amount !== null ? (float) $row->amount : null,
                        'meta'     => $row->meta_json,
                    ];
                }

            } elseif ($row->row_type === 'total') {
                if ($currentSection !== null && $currentSection['total'] === null) {
                    $currentSection['total'] = [
                        'label'  => $row->label,
                        'amount' => $row->amount !== null ? (float) $row->amount : null,
                    ];
                    $sections[]     = $currentSection;
                    $currentSection = null;
                } else {
                    $summaries[] = [
                        'label'  => $row->label,
                        'amount' => $row->amount !== null ? (float) $row->amount : null,
                    ];
                }
            }
        }

        if ($currentSection) {
            $sections[] = $currentSection;
        }

        // Last summary row is Total Equity
        $totalEquity        = !empty($summaries) ? array_pop($summaries) : null;
        $intermediateTotals = $summaries;

        return $this->sendResponse('RECORDS_FOUND', [
            'report_name'         => $report->report_name,
            'firm_name'           => $report->organization->firm_name ?? null,
            'as_at_date'          => $report->as_at_date->format('jS F, Y'),
            'currency'            => $report->currency,
            'sections'            => $sections,
            'intermediate_totals' => $intermediateTotals,
            'total_equity'        => $totalEquity,
        ]);
    }
}
