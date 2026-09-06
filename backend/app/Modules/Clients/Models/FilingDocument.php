<?php

namespace App\Modules\Clients\Models;

use App\Models\User;
use App\Modules\Files\Models\File;
use Illuminate\Database\Eloquent\Model;

class FilingDocument extends Model
{
    protected $table = 'filing_documents';

    protected $fillable = [
        'filing_id',
        'document_type',
        'file_id',
        'uploaded_by',
        'document_send_status',
        'link',
        'status',
        'comment',
    ];

    public function filing()
    {
        return $this->belongsTo(Filing::class, 'filing_id');
    }

    public function file()
    {
        return $this->belongsTo(File::class, 'file_id');
    }

    public function uploadedBy()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
