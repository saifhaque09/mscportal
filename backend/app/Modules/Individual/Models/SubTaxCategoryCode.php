<?php

namespace App\Modules\Individual\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class SubTaxCategoryCode extends Model
{
    protected $table = 'sub_tax_category_codes';

    protected $fillable = [
        'user_id',
        'added_by',
        'sub_tax_category_id',
        'code',
        'value',
        'status'
    ];

    /**
     * Relationship: belongs to SubTaxCategory (T4, etc.)
     */
    public function subcategory()
    {
        return $this->belongsTo(SubTaxCategory::class, 'sub_tax_category_id');
    }

    /**
     * Relationship: belongs to User
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
