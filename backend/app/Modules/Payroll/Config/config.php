<?php

/*
|--------------------------------------------------------------------------
| Payroll module configuration
|--------------------------------------------------------------------------
|
| Read via Config::get('payroll.*'). The enum catalogues below are the single
| source of truth shared by the inline Validator::make() rules (through
| Rule::in) and the export column map, so a value can never drift between
| validation and output.
|
*/

return [

    // Search and filter defaults, matching the other modules.
    'filters' => [
        'results_per_page' => 15,
        'page'             => 1,
        'search'           => '',
        'order_by'         => 'newest_first',
        'offset'           => 0,
    ],

    'order_by' => ['newest_first', 'newest_last', 'period_asc', 'period_desc'],

    // Mirrors firms.payment_type exactly. Payroll never defines its own
    // frequency; it snapshots the firm record.
    'pay_frequencies' => [
        'Monthly', 'Semi-Monthly', 'Bi-Weekly', 'Weekly', 'Bi-Monthly', 'Annual', 'Quarterly',
    ],

    // Case matters throughout: MySQL matches enum values case-insensitively,
    // PHP does not.
    //
    // settings_status is a progress indicator, NOT an activation flag — whether
    // payroll may run is decided by the agreement being 'Agreed'. 'Critical'
    // and 'Alerted' have no automatic producer yet; they are only reachable
    // through agreements/settings/update.
    'settings_status'  => ['Not Started', 'Submitted', 'Critical', 'Processed', 'Alerted'],

    // 'Sent' carries "with the client", which Pending + sent_at used to stand in
    // for. Only Inactive still needs a timestamp (terminated_at) to say whether
    // it was superseded or ended.
    //
    // 'Draft' is what a saved agreement holds. 'Pending' is still listed — the
    // queue filters on it — but no agreement row holds it any more: it means
    // "this firm has no agreement at all", which is the queue's report for a
    // missing row rather than a state anything writes.
    'agreement_status' => ['Draft', 'Pending', 'Sent', 'Inactive', 'Agreed', 'Reject'],

    // The wording a new agreement starts from, served by
    // POST /payroll/agreements/default so the create form can prefill itself.
    //
    // This is the SHIPPED FALLBACK, not the live value. The accountant edits the
    // template through /payroll/agreements/default/update, which writes it to
    // the shared `settings` table (context 'payroll_agreement', user_id 0); the
    // saved row wins whenever it exists, and reset=true deletes it to come back
    // here. Keeping the text in code means a fresh install serves something
    // sensible with nothing seeded, and there is always a known-good wording to
    // revert to.
    //
    // Nothing reads either version at create() time — the accountant posts back
    // whatever they ended up with, and the agreement then owns its own copy, so
    // editing the template never rewrites an agreement already drafted or signed.
    //
    // Plain text with blank-line paragraph breaks, matching the `body` column
    // real agreements already hold. Section 4 points at Agreement Settings
    // rather than naming a figure, so the template never contradicts the
    // price/price_type actually stored on the agreement.
    'default_agreement' => [
        'title' => 'Payroll Processing Terms and Conditions',
        'body'  => <<<'TEXT'
This Payroll Processing Agreement ("Agreement") is entered into between the Company ("Client") and the Payroll Service Provider ("Provider").

1. Services
Provider agrees to process payroll on behalf of the Client in accordance with the terms of this Agreement.

2. Responsibilities
Client agrees to provide accurate and complete information necessary for payroll processing.

3. Confidentiality
Provider will maintain the confidentiality of all client information and employee data.

4. Fees
Fees are charged at the rate set out in Agreement Settings and billed per pay run. Rates are exclusive of applicable taxes.

5. Term and termination
Either party may terminate this Agreement with 30 days written notice. Obligations accrued before termination survive.
TEXT,
    ],

    // How the agreement's price is charged. The only fee vocabulary — the
    // fee_amount/fee_basis pair this used to overlap was dropped on 2026-08-25.
    'price_types' => ['per person', 'total per run'],

    // Retired: the fee_basis column is gone. Kept solely so the create/update
    // endpoints can still VALIDATE a legacy `fee_basis` input before mapping it
    // onto price_type — see Agreements::LEGACY_FEE_BASIS_MAP. Delete both once
    // no caller sends the old field names.
    'legacy_fee_basis' => ['per_pay_run', 'per_employee_per_run', 'monthly_flat'],

    'employment_types' => ['full_time', 'part_time', 'casual', 'contract', 'seasonal'],
    'pay_bases'        => ['hourly', 'salary', 'commission'],
    'rate_types'       => ['hourly', 'annual_salary', 'per_period_salary'],
    'employee_status'  => ['active', 'on_leave', 'terminated'],
    'payment_methods'  => ['direct_deposit', 'cheque'],

    'period_status' => ['scheduled', 'open', 'closed', 'skipped'],

    'run_status' => [
        'draft', 'submitted', 'in_review', 'client_update_required', 'resubmitted',
        'ready_to_process', 'processing', 'payslips_uploaded', 'processed', 'cancelled',
    ],

    'line_status'     => ['ok', 'flagged', 'excluded'],
    'review_severity' => ['info', 'change_required'],
    'review_status'   => ['open', 'addressed', 'resolved', 'withdrawn'],

    // Numeric line fields the client may write. Anything not listed here is
    // server-owned (gross_amount above all) and is discarded on save.
    'line_numeric_fields' => [
        'regular_hours', 'overtime_hours', 'stat_holiday_hours', 'vacation_hours', 'sick_hours',
        'overtime_rate_multiplier', 'salary_amount', 'bonus_amount', 'commission_amount',
        'other_earnings_amount', 'reimbursement_amount', 'deduction_amount',
    ],

    // Warning thresholds for collectRunIssues(). Warnings never block a
    // submission; they surface on the review screen.
    'thresholds' => [
        'max_regular_hours_per_period' => 200,
        'max_overtime_hours_per_period' => 100,
    ],

    // Header => run line accessor, for the external payroll software export.
    'export_columns' => [
        'Employee No'         => 'employee_number',
        'Employee'            => 'employee_name',
        'Pay Basis'           => 'pay_basis',
        'Rate'                => 'rate_amount',
        'Regular Hours'       => 'regular_hours',
        'OT Hours'            => 'overtime_hours',
        'OT Multiplier'       => 'overtime_rate_multiplier',
        'Stat Holiday Hours'  => 'stat_holiday_hours',
        'Vacation Hours'      => 'vacation_hours',
        'Salary Amount'       => 'salary_amount',
        'Bonus'               => 'bonus_amount',
        'Commission'          => 'commission_amount',
        'Other Earnings'      => 'other_earnings_amount',
        'Other Earnings Label' => 'other_earnings_label',
        'Reimbursement'       => 'reimbursement_amount',
        'Deduction'           => 'deduction_amount',
        'Deduction Label'     => 'deduction_label',
        'Gross'               => 'gross_amount',
    ],

    // How many periods a single generate call creates by default.
    'periods_per_generate' => 26,
];
