<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DeadlineSeeder extends Seeder
{
    public function run(): void
    {
        $records = [
            [
                'name'        => 'Next Payroll Due',
                'slug'        => 'next_payroll_due',
                'type'        => 'payroll',
                'description' => 'Process bi-weekly payroll for all employees',
                'status'      => 'Active',
            ],
            [
                'name'        => 'Payroll Tax Remittance (PD7A)',
                'slug'        => 'payroll_tax_remittance_pd7a',
                'type'        => 'payroll',
                'description' => 'Remit payroll deductions to CRA',
                'status'      => 'Active',
            ],
            [
                'name'        => 'T4 Submission',
                'slug'        => 't4_submission',
                'type'        => 'payroll',
                'description' => 'Submit T4 slips for tax year',
                'status'      => 'Active',
            ],
            [
                'name'        => 'HST Return Filing',
                'slug'        => 'hst_return_filing',
                'type'        => 'tax',
                'description' => 'File HST/GST return',
                'status'      => 'Active',
            ],
            [
                'name'        => 'HST Closing Date',
                'slug'        => 'hst_closing_date',
                'type'        => 'tax',
                'description' => 'Books closing date for HST/GST remittance (15 days before the return filing deadline)',
                'status'      => 'Active',
            ],
            [
                'name'        => 'Year End Financial Statements',
                'slug'        => 'year_end_financial_statements',
                'type'        => 'tax',
                'description' => 'Prepare and finalize year-end financial statements',
                'status'      => 'Active',
            ],
            [
                'name'        => 'GST/HST Remittance',
                'slug'        => 'gst_hst_remittance',
                'type'        => 'tax',
                'description' => 'Remit GST/HST collected to the CRA by the required due date.',
                'status'      => 'Active',
            ],
            [
                'name'        => 'Corporate Income Tax Return (T2)',
                'slug'        => 'corporate_income_tax_return_t2',
                'type'        => 'tax',
                'description' => 'Corporate Income Tax Return (T2) filing deadline (6 months after fiscal year end)',
                'status'      => 'Active',
            ],
            [
                'name'        => 'Corporate Tax Balance Payment Due for CCPCs',
                'slug'        => 'corporate_tax_balance_payment_ccpcs',
                'type'        => 'tax',
                'description' => 'Corporate tax balance payment due for CCPCs (3 months after fiscal year end)',
                'status'      => 'Active',
            ],
            [
                'name'        => 'Next Payroll Due (Weekly)',
                'slug'        => 'next_payroll_due_weekly',
                'type'        => 'payroll',
                'description' => 'Process weekly payroll for all employees, including salary calculations, deductions, and direct deposits.',
                'status'      => 'Active',
            ],
            [
                'name'        => 'Next Payroll Due (Bi-weekly)',
                'slug'        => 'next_payroll_due_bi_weekly',
                'type'        => 'payroll',
                'description' => 'Process bi-weekly payroll for all employees, including salary calculations, deductions, and direct deposits.',
                'status'      => 'Active',
            ],
            [
                'name'        => 'Next Payroll Due (Semi-monthly)',
                'slug'        => 'next_payroll_due_semi_monthly',
                'type'        => 'payroll',
                'description' => 'Process semi-monthly payroll for all employees on the scheduled pay dates, ensuring all earnings, deductions, and direct deposits are processed accurately.',
                'status'      => 'Active',
            ],
            [
                'name'        => 'Next Payroll Due (Monthly)',
                'slug'        => 'next_payroll_due_monthly',
                'type'        => 'payroll',
                'description' => 'Process monthly payroll for all employees, including salaries, statutory deductions, reimbursements, and direct deposits.',
                'status'      => 'Active',
            ],
            [
                'name'        => 'Next Payroll Due (Quarterly)',
                'slug'        => 'next_payroll_due_quarterly',
                'type'        => 'payroll',
                'description' => 'Process quarterly payroll for employees or contractors paid every quarter, ensuring all earnings, taxes, and deductions are accurately processed.',
                'status'      => 'Active',
            ],
            [
                'name'        => 'Next Payroll Due (Bi-monthly)',
                'slug'        => 'next_payroll_due_bi_monthly',
                'type'        => 'payroll',
                'description' => 'Process bi-monthly payroll for all employees, including salary calculations, deductions, and direct deposits.',
                'status'      => 'Active',
            ],
            [
                'name'        => 'Next Payroll Due (Annual)',
                'slug'        => 'next_payroll_due_annual',
                'type'        => 'payroll',
                'description' => 'Process annual payroll for employees or directors paid once per year, including all applicable earnings, taxes, deductions, and year-end adjustments.',
                'status'      => 'Active',
            ],
        ];

        foreach ($records as $record) {
            DB::table('deadlines')->updateOrInsert(
                ['slug' => $record['slug']],
                array_merge($record, ['updated_at' => now()])
            );
        }
    }
}
