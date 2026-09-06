<?php

namespace App\Modules\Payroll\Models;

use Illuminate\Database\Eloquent\Model;

class RunLine extends Model
{
    protected $table = 'payroll_run_lines';

    protected $fillable = [
        'payroll_run_id', 'payroll_employee_id',
        'employee_number', 'employee_name', 'pay_basis', 'rate_type', 'rate_amount',
        'payroll_employee_rate_id',
        'regular_hours', 'overtime_hours', 'stat_holiday_hours', 'vacation_hours',
        'sick_hours', 'overtime_rate_multiplier',
        'salary_amount', 'bonus_amount', 'commission_amount', 'other_earnings_amount',
        'reimbursement_amount', 'deduction_amount',
        'other_earnings_label', 'deduction_label',
        'gross_amount', 'status', 'note',
    ];

    protected $casts = [
        'rate_amount'              => 'decimal:2',
        'regular_hours'            => 'decimal:2',
        'overtime_hours'           => 'decimal:2',
        'stat_holiday_hours'       => 'decimal:2',
        'vacation_hours'           => 'decimal:2',
        'sick_hours'               => 'decimal:2',
        'overtime_rate_multiplier' => 'decimal:2',
        'salary_amount'            => 'decimal:2',
        'bonus_amount'             => 'decimal:2',
        'commission_amount'        => 'decimal:2',
        'other_earnings_amount'    => 'decimal:2',
        'reimbursement_amount'     => 'decimal:2',
        'deduction_amount'         => 'decimal:2',
        'gross_amount'             => 'decimal:2',
    ];

    public function run()
    {
        return $this->belongsTo(Run::class, 'payroll_run_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'payroll_employee_id');
    }

    /**
     * Gross for this line. Always recomputed server-side on save; whatever the
     * client sends for gross_amount is discarded. Gross only, by design --
     * CPP, EI and income tax stay with the external payroll software.
     */
    public function computeGross(): string
    {
        $rate = (float) $this->rate_amount;

        if ($this->pay_basis === 'hourly') {
            $earnings = $rate * (float) $this->regular_hours
                + $rate * (float) $this->overtime_rate_multiplier * (float) $this->overtime_hours
                + $rate * (float) $this->stat_holiday_hours
                + $rate * (float) $this->vacation_hours;
        } else {
            $earnings = (float) $this->salary_amount;
        }

        $earnings += (float) $this->bonus_amount
            + (float) $this->commission_amount
            + (float) $this->other_earnings_amount
            + (float) $this->reimbursement_amount
            - (float) $this->deduction_amount;

        return number_format(max(0, $earnings), 2, '.', '');
    }

    public function totalHours(): float
    {
        return (float) $this->regular_hours
            + (float) $this->overtime_hours
            + (float) $this->stat_holiday_hours
            + (float) $this->vacation_hours
            + (float) $this->sick_hours;
    }
}
