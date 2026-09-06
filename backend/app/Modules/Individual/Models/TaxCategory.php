<?php

namespace App\Modules\Individual\Models;

use Illuminate\Database\Eloquent\Model;

class TaxCategory extends Model
{
    protected $table = 'tax_categories';

    protected $fillable = [
        'name',
        'code',
        'description',
        'status'
    ];


    public function users()
    {
        return $this->belongsToMany(
            \App\Models\User::class,
            'user_tax_categories',
            'tax_category_id',
            'user_id'
        );
    }

    public function subTaxCategories()
{
    return $this->belongsToMany(
        SubTaxCategory::class,
        'category_subcategory_mapping',
        'tax_category_id',
        'sub_tax_category_id'
    );
}
}
