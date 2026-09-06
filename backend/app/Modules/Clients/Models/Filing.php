<?php

namespace App\Modules\Clients\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class Filing extends Model
{
    protected $table = 'filings';

    protected $fillable = [
        'firm_id',
        'year',
        'filing_type',
        'status',
        'started_by',
        'sent_at',
        'signed_at',
        'filed_at',
        'cra_confirmation_number',
    ];

    protected $casts = [
        'sent_at'   => 'datetime',
        'signed_at' => 'datetime',
        'filed_at'  => 'datetime',
    ];

    public function firm()
    {
        return $this->belongsTo(Firm::class, 'firm_id');
    }

    public function startedBy()
    {
        return $this->belongsTo(User::class, 'started_by');
    }

    public function documents()
    {
        return $this->hasMany(FilingDocument::class, 'filing_id');
    }
}
