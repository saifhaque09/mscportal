<?php

namespace App\Modules\Reports\Models;

use App\Modules\Clients\Models\Firm;
use Illuminate\Database\Eloquent\Model;

class ProfitLossReport extends Model
{
    protected $table = 'profit_loss_reports';

    protected $fillable = [
        'organization_id',
        'source',
        'report_name',
        'currency',
        'from_date',
        'to_date',
    ];

    protected $casts = [
        'from_date' => 'date',
        'to_date'   => 'date',
    ];

    public function organization()
    {
        return $this->belongsTo(Firm::class, 'organization_id');
    }

    public function rows()
    {
        return $this->hasMany(ProfitLossRow::class, 'report_id');
    }
}
