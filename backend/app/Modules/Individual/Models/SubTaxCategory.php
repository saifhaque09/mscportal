<?php
namespace App\Modules\Individual\Models;

use Illuminate\Database\Eloquent\Model;

class SubTaxCategory extends Model
{
    protected $table = 'sub_tax_categories';

    protected $fillable = [
        'code',
        'name',
        'description',
        'status',
        'taxpayer_type',   // ✅ add this
        'aliases'          // ✅ add this
    ];

    // ✅ Cast JSON field
    protected $casts = [
        'aliases' => 'array',
    ];

    /**
     * Many-to-Many with TaxCategory
     */
    public function categories()
    {
        return $this->belongsToMany(
            TaxCategory::class,
            'category_subcategory_mapping',
            'sub_tax_category_id',
            'tax_category_id'
        );
    }

    /**
     * One form can have many submissions (user data)
     */
    public function submissions()
    {
        return $this->hasMany(TaxFilerSubmission::class, 'sub_tax_category_id');
    }

    public function documents()
    {
        return $this->hasMany(TaxFilerDocument::class, 'sub_tax_category_id');
    }

    public function codes()
    {
        return $this->hasMany(SubTaxCategoryCode::class, 'sub_tax_category_id');
    }
}
