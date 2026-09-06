<?php

namespace App\Modules\Payroll\Models;

use App\Models\User;
use App\Modules\Clients\Models\Firm;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $table = 'payroll_settings';

    protected $fillable = [
        'firm_id', 'status', 'pay_frequency', 'period_anchor_date', 'pay_day_offset',
        'cutoff_days_before_pay', 'default_currency', 'export_format',
        'activated_at', 'suspended_at', 'activated_by',
    ];

    protected $casts = [
        'period_anchor_date' => 'date',
        'activated_at'       => 'datetime',
        'suspended_at'       => 'datetime',
    ];

    public function firm()
    {
        return $this->belongsTo(Firm::class, 'firm_id');
    }

    public function activatedBy()
    {
        return $this->belongsTo(User::class, 'activated_by');
    }

    /**
     * Whether payroll is switched on for this firm.
     *
     * Derived from the agreement, not from this row's own status: since the
     * status column became a progress indicator ('Not Started' … 'Processed')
     * it no longer carries activation at all, and an accepted agreement is the
     * single source of truth for whether payroll may run. Keeping the check
     * behind this method means the run guards did not have to change.
     */
    public function isActive(): bool
    {
        return Agreement::where('firm_id', $this->firm_id)
            ->where('status', 'Agreed')
            ->exists();
    }
}
