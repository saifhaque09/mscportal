<?php

namespace App\Modules\Payroll\Controllers;

use App\Http\Controllers\BaseController;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Payroll\Models\Run;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * The handoff to the external payroll software.
 *
 * This module never calculates payroll — CPP, EI and income tax are entirely
 * the external software's job. What leaves here is the approved input: who,
 * at what rate, for how many hours.
 *
 * Exports are streamed rather than persisted. The run is already the durable
 * record, and writing a file per download would accumulate near-duplicates in
 * S3 for no benefit; payroll_runs.export_file_id stays unused in this phase.
 *
 * Pattern cloned from Reports\Controllers\BalanceSheet, which already does
 * both formats in this codebase.
 */
class Exports extends BaseController
{
    private function run(string $runGuid): ?Run
    {
        return Run::where('guid', $runGuid)->with(['firm', 'period'])->first();
    }

    /**
     * Resolve the run and check access, or return the error response.
     * Returns [Run, null] on success and [null, Response] on failure.
     */
    private function resolve(string $runGuid): array
    {
        $run = $this->run($runGuid);
        if (! $run) {
            return [null, $this->sendError('PAYROLL_RUN_NOT_FOUND', 404)];
        }
        if (! $this->authorizeFirmScope($run->firm_id, 'firms.manage', 'manage_payroll')) {
            return [null, $this->sendError('UNAUTHORIZED', 403)];
        }

        return [$run, null];
    }

    /** Header row plus the data rows, shared by every format. */
    private function rowsFor(Run $run): array
    {
        $columns = Config::get('payroll.export_columns');
        $period = $run->period;

        $rows = [array_merge(array_keys($columns), ['Period Start', 'Period End', 'Pay Date'])];

        foreach ($run->lines()->orderBy('employee_name')->get() as $line) {
            $row = [];
            foreach ($columns as $accessor) {
                $row[] = $line->{$accessor};
            }
            $row[] = $period?->period_start?->toDateString();
            $row[] = $period?->period_end?->toDateString();
            $row[] = $period?->pay_date?->toDateString();

            $rows[] = $row;
        }

        return $rows;
    }

    private function filenameFor(Run $run, string $extension): string
    {
        $firm = Str::slug($run->firm->firm_name ?? 'payroll');
        $end = $run->period?->period_end?->toDateString() ?? 'export';

        return "payroll-{$firm}-{$end}.{$extension}";
    }

    /** JSON preview of exactly what the file will contain. */
    public function preview(Request $request, string $runGuid = '')
    {
        [$run, $error] = $this->resolve($runGuid);
        if ($error) {
            return $error;
        }

        $rows = $this->rowsFor($run);

        return $this->sendResponse('RECORDS_FOUND', [
            'columns' => array_shift($rows),
            'data'    => $rows,
            'run'     => [
                'guid'           => $run->guid,
                'status'         => $run->status,
                'employee_count' => $run->employee_count,
                'total_gross'    => $run->total_gross,
            ],
        ]);
    }

    public function csv(Request $request, string $runGuid = '')
    {
        [$run, $error] = $this->resolve($runGuid);
        if ($error) {
            return $error;
        }

        $rows = $this->rowsFor($run);
        $fileName = $this->filenameFor($run, 'csv');

        ActivityLog::record('payroll', "exported payroll CSV for {$run->firm->firm_name}", null, auth()->id());

        return response()->stream(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        }, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            'Cache-Control'       => 'no-store',
        ]);
    }

    public function xlsx(Request $request, string $runGuid = '')
    {
        [$run, $error] = $this->resolve($runGuid);
        if ($error) {
            return $error;
        }

        $rows = $this->rowsFor($run);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Payroll');
        $sheet->fromArray($rows, null, 'A1');
        $sheet->getStyle('A1:' . $sheet->getHighestColumn() . '1')->getFont()->setBold(true);

        foreach (range('A', $sheet->getHighestColumn()) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $fileName = $this->filenameFor($run, 'xlsx');
        $tempPath = tempnam(sys_get_temp_dir(), 'payroll_') . '.xlsx';
        (new Xlsx($spreadsheet))->save($tempPath);

        ActivityLog::record('payroll', "exported payroll XLSX for {$run->firm->firm_name}", null, auth()->id());

        return response()->download($tempPath, $fileName, [
            'Content-Type'  => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'no-store',
        ])->deleteFileAfterSend(true);
    }
}
