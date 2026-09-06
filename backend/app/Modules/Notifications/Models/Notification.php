<?php

namespace App\Modules\Notifications\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class Notification extends Model
{
    protected $table = 'notifications';

    /**
     * Notifications only track created_at (mutated later via is_read/read_at, not a fresh row) — no updated_at column.
     *
     * @var bool
     */
    public $timestamps = false;

    protected $fillable = [
        'sender_id',
        'receiver_id',
        'title',
        'message',
        'type',
        'filing_id',
        'payroll_run_id',
        'is_read',
        'read_at',
        'created_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    /**
     * Write a single notification for a user.
     *
     * @param int $receiverId users.id the notification is for
     * @param string $title short notification title
     * @param string $message human-readable body
     * @param string $type free-text category, e.g. "new_device_login", "document_uploaded"
     * @param int|null $senderId users.id who triggered it; null for system-generated notifications
     * @param int|null $filingId filings.id this notification is about, if any — lets the
     *        frontend deep-link straight to that filing instead of a generic landing page
     */
    public static function record(int $receiverId, string $title, string $message, string $type, ?int $senderId = null, ?int $filingId = null): self
    {
        return static::create([
            'sender_id'   => $senderId,
            'receiver_id' => $receiverId,
            'title'       => $title,
            'message'     => $message,
            'type'        => $type,
            'filing_id'   => $filingId,
            'is_read'     => false,
            'created_at'  => now(),
        ]);
    }

    /**
     * Same as record(), for notifications about a payroll run.
     *
     * A sibling rather than a seventh argument on record(): filing_id is a real
     * foreign key constrained to filings and cannot carry a payroll run id, and
     * this way record()'s signature and all 20-odd of its existing call sites
     * stay untouched.
     *
     * @param int $payrollRunId payroll_runs.id this is about — lets the frontend
     *        deep-link straight to that payroll instead of a generic landing page
     */
    public static function recordForPayrollRun(int $receiverId, string $title, string $message, string $type, ?int $senderId = null, ?int $payrollRunId = null): self
    {
        return static::create([
            'sender_id'      => $senderId,
            'receiver_id'    => $receiverId,
            'title'          => $title,
            'message'        => $message,
            'type'           => $type,
            'payroll_run_id' => $payrollRunId,
            'is_read'        => false,
            'created_at'     => now(),
        ]);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }
}
