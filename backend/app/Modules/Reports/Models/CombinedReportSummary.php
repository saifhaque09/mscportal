<?php

namespace App\Modules\Reports\Models;

use App\Modules\Clients\Models\Firm;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CombinedReportSummary extends Model
{
    protected $table = 'combined_report_summaries';

    protected $fillable = [
        'organization_id',
        'from_date',
        'to_date',
        'as_at_date',
        'operating_revenue',
        'non_operating_revenues',
        'other_adjustments',
        'gross_profit',
        'fixed_expenses',
        'other_expenses',
        'variable_expenses',
        'total_expenses',
        'net_profit',
        'cash_and_banks',
        'account_receivable',
        'inventory',
        'equipment',
        'total_assets',
        'account_payable',
        'loans_payable',
        'account_expenses',
        'total_liabilities',
        'total_equity',
    ];

    protected $casts = [
        'from_date'   => 'date',
        'to_date'     => 'date',
        'as_at_date'  => 'date',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Firm::class, 'organization_id');
    }

    public function trends(): HasMany
    {
        return $this->hasMany(CombinedReportTrend::class, 'report_id');
    }
}
