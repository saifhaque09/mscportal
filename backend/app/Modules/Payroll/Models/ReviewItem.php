<?php

namespace App\Modules\Payroll\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class ReviewItem extends Model
{
    protected $table = 'payroll_review_items';

    protected $fillable = [
        'payroll_run_id', 'payroll_run_line_id', 'field', 'severity', 'status', 'comment',
        'raised_by', 'raised_at', 'addressed_at', 'resolved_at', 'resolved_by',
        'resolution_note', 'round',
    ];

    protected $casts = [
        'raised_at'    => 'datetime',
        'addressed_at' => 'datetime',
        'resolved_at'  => 'datetime',
    ];

    public function run()
    {
        return $this->belongsTo(Run::class, 'payroll_run_id');
    }

    public function line()
    {
        return $this->belongsTo(RunLine::class, 'payroll_run_line_id');
    }

    public function raisedBy()
    {
        return $this->belongsTo(User::class, 'raised_by');
    }
}
