<?php
namespace App\Modules\Individual\Models;

use Illuminate\Database\Eloquent\Model;

class UserStatusSubTaxCategory extends Model
{
    protected $table = 'user_status_sub_tax_categories';

    protected $fillable = [
        'user_id',
        'year',
        'sub_tax_category_id',
        'status'
    ];
}