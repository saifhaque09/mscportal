<?php

namespace App\Modules\Payroll\Models;

use App\Models\User;
use App\Modules\Clients\Models\Firm;
use App\Modules\Files\Models\File;
use Illuminate\Database\Eloquent\Model;

class Run extends Model
{
    protected $table = 'payroll_runs';

    protected $fillable = [
        'guid', 'firm_id', 'payroll_period_id', 'status', 'version',
        'employee_count', 'total_hours', 'total_gross', 'currency',
        'submitted_at', 'submitted_by', 'review_started_at', 'reviewed_by',
        'changes_requested_at', 'resubmitted_at', 'approved_at', 'approved_by',
        'processing_started_at', 'payslips_uploaded_at', 'processed_at',
        'cancelled_at', 'cancelled_by', 'cancellation_reason',
        'client_note', 'accountant_note', 'export_file_id',
    ];

    protected $casts = [
        'total_hours'           => 'decimal:2',
        'total_gross'           => 'decimal:2',
        'submitted_at'          => 'datetime',
        'review_started_at'     => 'datetime',
        'changes_requested_at'  => 'datetime',
        'resubmitted_at'        => 'datetime',
        'approved_at'           => 'datetime',
        'processing_started_at' => 'datetime',
        'payslips_uploaded_at'  => 'datetime',
        'processed_at'          => 'datetime',
        'cancelled_at'          => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | State machine
    |--------------------------------------------------------------------------
    |
    | Lives on the model rather than in a service because this codebase has no
    | service layer inside modules, but does already put static domain
    | behaviour on models (see ActivityLog::record, Notification::record).
    |
    | Only status legality is decided here. Business preconditions that are not
    | pure status -- the agreement being active, open change requests, invalid
    | lines -- stay as explicit controller guards, because each needs its own
    | message code and the error contract in this codebase is one code per
    | failure.
    |
    */

    public const TRANSITIONS = [
        'draft'                  => ['submitted', 'cancelled'],
        'submitted'              => ['in_review', 'draft', 'cancelled'],
        'in_review'              => ['client_update_required', 'ready_to_process', 'cancelled'],
        'client_update_required' => ['resubmitted', 'cancelled'],
        'resubmitted'            => ['in_review', 'client_update_required', 'cancelled'],
        // 'draft' here is the reopen path.
        'ready_to_process'       => ['processing', 'draft', 'cancelled'],
        // The two below are the payslip phase. Present so that phase needs no
        // migration, but nothing transitions into them yet.
        'processing'             => ['payslips_uploaded', 'cancelled'],
        'payslips_uploaded'      => ['processed', 'cancelled'],
        'processed'              => [],
        'cancelled'              => [],
    ];

    /** Statuses in which the client may still edit lines. */
    public const CLIENT_EDITABLE = ['draft', 'client_update_required'];

    /** Statuses in which the run is sitting with the accountant. */
    public const WITH_ACCOUNTANT = ['submitted', 'in_review', 'resubmitted'];

    /** The timestamp/actor column pair stamped on entering each status. */
    private const STAMPS = [
        'submitted'              => ['submitted_at', 'submitted_by'],
        'in_review'              => ['review_started_at', 'reviewed_by'],
        'client_update_required' => ['changes_requested_at', null],
        'resubmitted'            => ['resubmitted_at', null],
        'ready_to_process'       => ['approved_at', 'approved_by'],
        'processing'             => ['processing_started_at', null],
        'payslips_uploaded'      => ['payslips_uploaded_at', null],
        'processed'              => ['processed_at', null],
        'cancelled'              => ['cancelled_at', 'cancelled_by'],
    ];

    public function canTransitionTo(string $to): bool
    {
        return in_array($to, self::TRANSITIONS[$this->status] ?? [], true);
    }

    public function isClientEditable(): bool
    {
        return in_array($this->status, self::CLIENT_EDITABLE, true);
    }

    /**
     * Move the run to $to, stamp the matching *_at/*_by columns, and append one
     * payroll_run_events row. Returns false if the transition is illegal, so
     * the caller can return INVALID_STATUS_TRANSITION without a second check.
     *
     * Callers are expected to wrap this plus their own side effects
     * (notifications, review items) in a DB transaction.
     */
    public function applyTransition(string $to, string $action, ?string $note = null, array $meta = []): bool
    {
        if (! $this->canTransitionTo($to)) {
            return false;
        }

        $from = $this->status;
        $actor = auth()->user();

        $this->status = $to;

        if (isset(self::STAMPS[$to])) {
            [$atColumn, $byColumn] = self::STAMPS[$to];
            $this->{$atColumn} = now();
            if ($byColumn !== null) {
                $this->{$byColumn} = $actor?->id;
            }
        }

        // A resubmission is a new version of the same run, which is what makes
        // the review loop legible on both sides.
        if ($to === 'resubmitted') {
            $this->version = $this->version + 1;
        }

        $this->save();

        RunEvent::create([
            'payroll_run_id' => $this->id,
            'from_status'    => $from,
            'to_status'      => $to,
            'action'         => $action,
            'actor_id'       => $actor?->id,
            'actor_role'     => $actor?->getRoleNames()->first(),
            'note'           => $note,
            'meta'           => $meta ?: null,
            'created_at'     => now(),
        ]);

        return true;
    }

    /**
     * Recalculate the cached header totals from the current lines. Called after
     * every line save so the review queue can sort and display without loading
     * every line of every run.
     */
    public function recalculateTotals(): void
    {
        $lines = $this->lines()->get();

        $this->employee_count = $lines->count();
        $this->total_hours = $lines->sum(fn (RunLine $l) => $l->totalHours());
        $this->total_gross = $lines->sum(fn (RunLine $l) => (float) $l->gross_amount);
        $this->save();
    }

    /** True while any change request is still outstanding — the approve/resubmit gate. */
    public function hasOpenChangeRequests(): bool
    {
        return $this->reviewItems()
            ->where('status', 'open')
            ->where('severity', 'change_required')
            ->exists();
    }

    public function firm()
    {
        return $this->belongsTo(Firm::class, 'firm_id');
    }

    public function period()
    {
        return $this->belongsTo(Period::class, 'payroll_period_id');
    }

    public function lines()
    {
        return $this->hasMany(RunLine::class, 'payroll_run_id');
    }

    public function events()
    {
        return $this->hasMany(RunEvent::class, 'payroll_run_id');
    }

    public function reviewItems()
    {
        return $this->hasMany(ReviewItem::class, 'payroll_run_id');
    }

    public function submittedBy()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewedBy()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function exportFile()
    {
        return $this->belongsTo(File::class, 'export_file_id');
    }
}
