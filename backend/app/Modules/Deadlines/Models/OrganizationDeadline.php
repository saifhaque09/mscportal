<?php

namespace App\Modules\Deadlines\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\Clients\Models\Firm;

class OrganizationDeadline extends Model
{
    protected $table = 'organization_deadlines';

    protected $fillable = [
        'organization_id',
        'deadline_id',
        'due_date',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'status'   => 'string',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Firm::class, 'organization_id');
    }

    public function deadline(): BelongsTo
    {
        return $this->belongsTo(Deadline::class, 'deadline_id');
    }
}
