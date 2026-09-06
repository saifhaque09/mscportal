<?php

namespace App\Modules\Payroll\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class RunEvent extends Model
{
    protected $table = 'payroll_run_events';

    /** Write-once, like activity_logs and notifications. */
    public $timestamps = false;

    protected $fillable = [
        'payroll_run_id', 'from_status', 'to_status', 'action',
        'actor_id', 'actor_role', 'note', 'meta', 'created_at',
    ];

    protected $casts = [
        'meta'       => 'array',
        'created_at' => 'datetime',
    ];

    public function run()
    {
        return $this->belongsTo(Run::class, 'payroll_run_id');
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
