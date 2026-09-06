<?php

namespace App\Modules\Reports\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\Clients\Models\Firm;
use App\Modules\Files\Models\File;

class ReportDocument extends Model
{
    protected $table = 'report_documents';

    protected $fillable = [
        'organization_id',
        'report_type',
        'file_id',
        'created_by',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Firm::class, 'organization_id');
    }

    public function file(): BelongsTo
    {
        return $this->belongsTo(File::class, 'file_id');
    }
}
