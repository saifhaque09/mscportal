<?php

namespace App\Modules\Reports\Models;

use Illuminate\Database\Eloquent\Model;

class BalanceSheetCategory extends Model
{
    protected $table = 'balance_sheet_categories';

    protected $fillable = ['name', 'type'];
}
