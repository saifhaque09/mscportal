<?php

namespace App\Modules\Clients\Models;

use App\Models\User;
use App\Modules\Individual\Models\SubTaxCategory;
use Illuminate\Database\Eloquent\Model;

class FirmSubTaxCategoryCode extends Model
{
    protected $table = 'firm_sub_tax_category_codes';

    protected $fillable = [
        'firm_id',
        'added_by',
        'sub_tax_category_id',
        'checklist_item_id',
        'code',
        'value',
        'vendor_name',
        'invoice_date',
        'invoice_number',
        'gst_hst_tax',
        'status',
        'year',
    ];

    protected $casts = [
        'invoice_date' => 'date',
    ];

    public function firm()
    {
        return $this->belongsTo(Firm::class, 'firm_id');
    }

    public function subcategory()
    {
        return $this->belongsTo(SubTaxCategory::class, 'sub_tax_category_id');
    }

    public function checklistItem()
    {
        return $this->belongsTo(Checklist::class, 'checklist_item_id');
    }

    public function addedBy()
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
