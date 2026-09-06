<?php

namespace App\Modules\ActivityLogs\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;
use App\Modules\Files\Models\File;

class ActivityLog extends Model
{
    protected $table = 'activity_logs';

    /**
     * Logs are write-once — no updated_at, just the `timestamp` column.
     *
     * @var bool
     */
    public $timestamps = false;

    protected $fillable = [
        'log_name',
        'description',
        'document_id',
        'user_id',
        'timestamp',
    ];

    /**
     * Write a single activity log entry.
     *
     * @param string $logName e.g. "document.uploaded", "document.deleted"
     * @param string|null $description human-readable detail
     * @param int|null $documentId files.id this activity relates to, if any
     * @param int|null $userId actor performing the action; defaults to the authenticated user
     */
    public static function record(string $logName, ?string $description = null, ?int $documentId = null, ?int $userId = null): self
    {
        return static::create([
            'log_name'    => $logName,
            'description' => $description,
            'document_id' => $documentId,
            'user_id'     => $userId ?? auth()->id(),
            'timestamp'   => now(),
        ]);
    }

    /**
     * Write an entry whose description is built from the actor's role, e.g. "Admin Login", "Taxfiler updates profile".
     * Falls back to "User" as the role when the user has no assigned role.
     */
    public static function recordRoleAction(string $logName, User $user, string $action, ?int $documentId = null): self
    {
        $roleName = $user->getRoleNames()->first() ?? 'User';

        return static::record($logName, "{$roleName} {$action}", $documentId, $user->id);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(File::class, 'document_id');
    }
}
