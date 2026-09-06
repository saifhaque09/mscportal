<?php

namespace App\Modules\Payroll\Models;

use App\Models\User;
use App\Modules\Clients\Models\Firm;
use App\Modules\Files\Models\File;
use Illuminate\Database\Eloquent\Model;

class Agreement extends Model
{
    protected $table = 'payroll_agreements';

    /**
     * One column per fact. The duplicated groups this table used to carry —
     * fee_amount/fee_basis beside price/price_type, service_start_date beside
     * effective_date, terms/included_services beside body, and an activated_at
     * that accept() only ever set to the same value as accepted_at — were
     * collapsed on 2026-08-25. The endpoints still accept the retired names as
     * input aliases; see Agreements::LEGACY_INPUT_ALIASES.
     */
    protected $fillable = [
        'guid', 'firm_id', 'title', 'body', 'version', 'status', 'pay_frequency',
        'period_anchor_date', 'effective_date', 'end_date',
        'price_type', 'price', 'currency',
        'notes', 'prepared_by',
        'sent_at', 'viewed_at', 'accepted_at', 'terminated_at',
        'decline_reason', 'signed_file_id',
    ];

    protected $casts = [
        'price'              => 'decimal:2',
        'version'            => 'decimal:1',
        'period_anchor_date' => 'date',
        'effective_date'     => 'date',
        'end_date'           => 'date',
        'sent_at'            => 'datetime',
        'viewed_at'          => 'datetime',
        'accepted_at'        => 'datetime',
        'terminated_at'      => 'datetime',
    ];

    /**
     * The fields that make up the agreed document, in the order they are
     * hashed. Anything a client would consider part of what they accepted
     * belongs here — adding a field changes every future hash but leaves the
     * ones already recorded intact, which is the point of storing the hash
     * rather than recomputing it.
     */
    public const CONTENT_FIELDS = [
        'title', 'body', 'effective_date', 'end_date',
        'price', 'price_type', 'currency', 'pay_frequency', 'period_anchor_date',
    ];

    /*
    |--------------------------------------------------------------------------
    | Lifecycle
    |--------------------------------------------------------------------------
    |
    | Every guard in the controller goes through the predicates below rather
    | than comparing the string directly:
    |
    |   Draft                          saved, still with the accountant
    |   Sent                           it is with the client, awaiting a decision
    |   Agreed                         accepted; the only state payroll runs in
    |   Reject                         the client declined; revisable and re-sendable
    |   Inactive + terminated_at NULL  replaced by a newer version
    |   Inactive + terminated_at set   the service was ended
    |
    | Only the last pair still needs a timestamp to tell it apart. Drafting vs
    | with-the-client used to need one too, until 'Sent' was added as its own
    | value; sent_at is now audit data rather than a discriminator.
    |
    | 'Pending' is in the enum but NO ROW HOLDS IT. It is the value Runs::queue()
    | reports for a firm that has no agreement at all — "none raised yet" —
    | which is a different fact from "saved but not sent" and used to share this
    | one word with it. Saving writes 'Draft'; see the 2026-08-25 migration.
    |
    */

    /** Statuses an agreement can hold while it is still the firm's live one. */
    public const LIVE = ['Draft', 'Sent', 'Agreed'];

    /** Versions step in tenths: 1.0, 1.1, … 1.9, 2.0. */
    public const VERSION_STEP = 0.1;

    public function firm()
    {
        return $this->belongsTo(Firm::class, 'firm_id');
    }

    public function preparedBy()
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function signedFile()
    {
        return $this->belongsTo(File::class, 'signed_file_id');
    }

    public function acceptance()
    {
        return $this->hasOne(AgreementAcceptance::class, 'payroll_agreement_id');
    }

    /** Saved and not yet sent — what create() writes and update() may edit. */
    public function isDraft(): bool
    {
        return $this->status === 'Draft';
    }

    /** In the accountant's hands: a fresh draft, or one the client declined. */
    public function isUnsent(): bool
    {
        return in_array($this->status, ['Draft', 'Reject'], true);
    }

    /** Sitting with the client, awaiting accept or decline. */
    public function isAwaitingClient(): bool
    {
        return $this->status === 'Sent';
    }

    /**
     * The next version for a firm: 1.0 for the first, then +0.1 each time.
     *
     * Counted in tenths rather than as a float, so 1.9 rolls to 2.0 with no
     * special case and no accumulated rounding error.
     */
    public static function nextVersionFor(int $firmId): string
    {
        $max = static::where('firm_id', $firmId)->max('version');

        if ($max === null) {
            return '1.0';
        }

        return number_format(((int) round((float) $max * 10) + 1) / 10, 1, '.', '');
    }

    public function isAgreed(): bool
    {
        return $this->status === 'Agreed';
    }

    /**
     * The clause set may only be edited before the client has seen it. A
     * declined agreement is editable again — that is the revise-and-re-send
     * path decline() exists to enable.
     */
    public function isEditable(): bool
    {
        return $this->isUnsent();
    }

    /**
     * Removable only while it is a draft the client has never seen. Once an
     * agreement leaves the office it is the record of what the client was
     * shown: a declined one is revised with update() and re-sent, an accepted
     * one is ended with terminate(). Neither is ever deleted.
     *
     * Deleting a never-sent draft frees its version number for reuse, which is
     * the wanted behaviour — no one outside the firm ever saw it.
     */
    public function isDeletable(): bool
    {
        return $this->isDraft() && $this->sent_at === null;
    }

    /** An agreement can only be sent once it actually says something. */
    public function hasContent(): bool
    {
        return trim((string) $this->body) !== '';
    }

    /**
     * SHA-256 over the canonical JSON of the agreed content, recorded at
     * acceptance so the agreed text is tamper-evident without generating and
     * storing a PDF.
     *
     * This used to hash the `terms` JSON alone. That column is gone, and while
     * it existed the hash was close to worthless in practice: the agreements
     * being written filled `body` and left `terms` NULL, so the evidence was a
     * hash of an empty array. It now covers every field of CONTENT_FIELDS.
     *
     * Keys are sorted and dates normalised to Y-m-d, so re-reading the same row
     * always produces the same hash regardless of column order or cast state.
     */
    public static function hashContent(self $agreement): string
    {
        $content = [];

        foreach (self::CONTENT_FIELDS as $field) {
            $value = $agreement->{$field};

            $content[$field] = $value instanceof \DateTimeInterface
                ? $value->format('Y-m-d')
                : ($value === null ? null : (string) $value);
        }

        ksort($content);

        return hash('sha256', json_encode($content, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }
}
