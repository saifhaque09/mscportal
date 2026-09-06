<?php

namespace App\Modules\Reports\Models;

use Illuminate\Database\Eloquent\Model;

class ProfitLossRow extends Model
{
    protected $table = 'profit_loss_rows';

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
        'meta_json' => 'array',
        'amount'    => 'float',
    ];

    public function report()
    {
        return $this->belongsTo(ProfitLossReport::class, 'report_id');
    }

    public function category()
    {
        return $this->belongsTo(ProfitLossCategory::class, 'category_id');
    }

    public function parent()
    {
        return $this->belongsTo(ProfitLossRow::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(ProfitLossRow::class, 'parent_id');
    }
}
