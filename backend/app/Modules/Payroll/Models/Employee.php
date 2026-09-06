<?php

namespace App\Modules\Payroll\Models;

use App\Models\User;
use App\Modules\Clients\Models\Firm;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $table = 'payroll_employees';

    protected $fillable = [
        'guid', 'firm_id', 'user_id', 'employee_number', 'employment_type', 'pay_basis',
        'department', 'job_title', 'hire_date', 'termination_date', 'termination_reason',
        'status', 'province_of_employment', 'standard_hours_per_period',
        'vacation_pay_percent', 'payment_method',
    ];

    protected $casts = [
        'hire_date'                 => 'date',
        'termination_date'          => 'date',
        'standard_hours_per_period' => 'decimal:2',
        'vacation_pay_percent'      => 'decimal:2',
    ];

    public function firm()
    {
        return $this->belongsTo(Firm::class, 'firm_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function rates()
    {
        return $this->hasMany(EmployeeRate::class, 'payroll_employee_id');
    }

    public function runLines()
    {
        return $this->hasMany(RunLine::class, 'payroll_employee_id');
    }

    /** Name comes from the linked account. It is never duplicated onto this table. */
    public function displayName(): string
    {
        return trim(($this->user->first_name ?? '') . ' ' . ($this->user->last_name ?? ''));
    }

    /**
     * The rate in force on a given date: the latest effective_from that is not
     * in the future relative to it, ignoring rows already closed out.
     */
    public function rateOn($date): ?EmployeeRate
    {
        return $this->rates()
            ->whereDate('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $date);
            })
            ->orderByDesc('effective_from')
            ->first();
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
