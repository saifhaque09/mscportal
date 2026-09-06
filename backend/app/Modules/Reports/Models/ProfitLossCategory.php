<?php

namespace App\Modules\Reports\Models;

use Illuminate\Database\Eloquent\Model;

class ProfitLossCategory extends Model
{
    protected $table = 'profit_loss_categories';

    protected $fillable = ['name', 'type'];

    public function rows()
    {
        return $this->hasMany(ProfitLossRow::class, 'category_id');
    }
}
