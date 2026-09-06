<?php

namespace App\Modules\Reports\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BalanceSheetRow extends Model
{
    protected $table = 'balance_sheet_rows';

    protected $fillable = [
        'report_id',
        'category_id',
        'parent_id',
        'label',
        'row_type',
        'amount',
        'sort_order',
        'level_depth',
        'meta_json',
    ];

    protected $casts = [
        'amount'   => 'float',
        'meta_json' => 'array',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(BalanceSheetReport::class, 'report_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(BalanceSheetCategory::class, 'category_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(BalanceSheetRow::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(BalanceSheetRow::class, 'parent_id');
    }
}
