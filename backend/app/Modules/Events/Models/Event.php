<?php

namespace App\Modules\Events\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\Clients\Models\Firm;

class Event extends Model
{
    protected $table = 'events';

    protected $fillable = [
        'guid',
        'firm_id',
        'event_name',
        'email',
        'date',
        'from_time',
        'to_time',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    public function firm(): BelongsTo
    {
        return $this->belongsTo(Firm::class, 'firm_id');
    }
}
