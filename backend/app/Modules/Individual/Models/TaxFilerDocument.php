<?php

namespace App\Modules\Individual\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;
use App\Modules\Files\Models\File;

class TaxFilerDocument extends Model
{
    use SoftDeletes;

    protected $table = 'tax_filer_documents';

    protected $fillable = [
        'user_id',
        'year',
        'sub_tax_category_id',
        'file_id',
        'document_type',
        'status',
        'comments',
        'month',
        'uploaded_by',
    ];

    protected $casts = [
        'month' => 'integer',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function subTaxCategory()
    {
        return $this->belongsTo(SubTaxCategory::class, 'sub_tax_category_id');
    }

    public function file()
    {
        return $this->belongsTo(File::class, 'file_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
