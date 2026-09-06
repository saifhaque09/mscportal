<?php

namespace App\Modules\Payroll\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class AgreementAcceptance extends Model
{
    protected $table = 'payroll_agreement_acceptances';

    protected $fillable = [
        'payroll_agreement_id', 'accepted_by', 'accepted_name', 'accepted_email',
        'accepted_role', 'acceptance_method', 'typed_signature', 'content_hash',
        'ip_address', 'user_agent', 'accepted_at',
    ];

    protected $casts = [
        'accepted_at' => 'datetime',
    ];

    public function agreement()
    {
        return $this->belongsTo(Agreement::class, 'payroll_agreement_id');
    }

    public function acceptedBy()
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }
}
