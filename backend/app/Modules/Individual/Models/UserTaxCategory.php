<?php

namespace App\Modules\Individual\Models;

use Illuminate\Database\Eloquent\Model;

class UserTaxCategory extends Model
{
    protected $table = 'user_tax_categories';

    protected $fillable = [
        'user_id',
        'tax_category_id',
        'year',
    ];

    public function documents()
    {
        return $this->hasMany(TaxFilerDocument::class, 'user_id', 'user_id')
            ->whereColumn('tax_filer_documents.year', 'user_tax_categories.year');
    }

    public function taxCategory()
    {
        return $this->belongsTo(TaxCategory::class, 'tax_category_id');
    }

    public function subTaxCategoryCodes()
    {
        return $this->hasMany(SubTaxCategoryCode::class, 'user_id', 'user_id');
    }
}
