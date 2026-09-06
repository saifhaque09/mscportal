<?php

namespace App\Modules\Reports\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CombinedReportTrend extends Model
{
    protected $table = 'combined_report_trends';

    protected $fillable = [
        'report_id',
        'trend_type',
        'year',
        'amount',
    ];

    protected $casts = [
        'amount' => 'float',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(CombinedReportSummary::class, 'report_id');
    }
}
