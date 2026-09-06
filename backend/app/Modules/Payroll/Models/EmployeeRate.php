<?php

namespace App\Modules\Payroll\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class EmployeeRate extends Model
{
    protected $table = 'payroll_employee_rates';

    protected $fillable = [
        'payroll_employee_id', 'rate_type', 'amount', 'currency',
        'effective_from', 'effective_to', 'reason', 'created_by',
    ];

    protected $casts = [
        'amount'         => 'decimal:2',
        'effective_from' => 'date',
        'effective_to'   => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'payroll_employee_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
