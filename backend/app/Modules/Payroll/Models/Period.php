<?php

namespace App\Modules\Payroll\Models;

use App\Modules\Clients\Models\Firm;
use Illuminate\Database\Eloquent\Model;

class Period extends Model
{
    protected $table = 'payroll_periods';

    protected $fillable = [
        'firm_id', 'pay_frequency', 'sequence', 'year',
        'period_start', 'period_end', 'pay_date', 'cutoff_date', 'status',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end'   => 'date',
        'pay_date'     => 'date',
        'cutoff_date'  => 'date',
    ];

    public function firm()
    {
        return $this->belongsTo(Firm::class, 'firm_id');
    }

    public function run()
    {
        return $this->hasOne(Run::class, 'payroll_period_id');
    }
}
