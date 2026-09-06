<?php

namespace App\Modules\Reports\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\Clients\Models\Firm;

class BalanceSheetReport extends Model
{
    protected $table = 'balance_sheet_reports';

    protected $fillable = [
        'organization_id',
        'source',
        'report_name',
        'currency',
        'as_at_date',
    ];

    protected $casts = [
        'as_at_date' => 'date',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Firm::class, 'organization_id');
    }

    public function rows(): HasMany
    {
        return $this->hasMany(BalanceSheetRow::class, 'report_id');
    }
}
