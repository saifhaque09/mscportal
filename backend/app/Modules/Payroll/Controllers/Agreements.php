<?php

namespace App\Modules\Payroll\Controllers;

use App\Helpers\Guid;
use App\Http\Controllers\BaseController;
use App\Models\User;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Clients\Models\Firm;
use App\Modules\Files\Controllers\Files;
use App\Modules\Notifications\Models\Notification;
use App\Modules\Organizations\Models\OrganizationUserAssignment;
use App\Modules\Payroll\Models\Agreement;
use App\Modules\Payroll\Models\AgreementAcceptance;
use App\Modules\Payroll\Models\Setting;
use App\Modules\Settings\Models\Setting as AppSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File as FileRule;
use Validator;

/**
 * Payroll service agreements, and the payroll activation they gate.
 *
 * Activation is the agreement lifecycle — a firm's payroll opens when a client
 * accepts an agreement and closes when it is terminated — so payroll_settings
 * is managed here rather than from a separate Settings controller that would
 * read confusingly next to the Settings module.
 *
 * No PDF is generated. The agreement is title + body text, rendered by the
 * client; the evidence of what was agreed is the acceptance row plus its
 * content_hash — a SHA-256 over every content field (Agreement::hashContent()),
 * which is stronger than an unsigned generated document. An optional
 * countersigned PDF can be uploaded afterwards.
 */
class Agreements extends BaseController
{
    /**
     * Resolve the firm from the route guid. Returns null when not found so the
     * caller can emit BUSINESS_NOT_FOUND itself, matching the sibling modules.
     */
    private function firm(string $guid): ?Firm
    {
        return Firm::where('guid', $guid)->first();
    }

    /** payroll_settings row for a firm, created on first read. */
    private function settingsFor(Firm $firm): Setting
    {
        return Setting::firstOrCreate(
            ['firm_id' => $firm->id],
            ['status' => 'Not Started', 'pay_frequency' => $firm->payment_type]
        );
    }

    /**
     * True when the caller is the firm's own client user (or an Admin).
     * Accepting or declining an agreement is the client's act specifically —
     * an accountant holding firms.manage must never be able to accept on the
     * client's behalf, which authorizeFirmScope() alone would allow.
     */
    private function isFirmClient(Firm $firm): bool
    {
        $user = auth()->user();

        if (! $user) {
            return false;
        }
        if ($user->hasRole('Admin')) {
            return true;
        }

        return $user->hasRole('Client') && (int) $user->firm_id === (int) $firm->id;
    }

    /*
    |--------------------------------------------------------------------------
    | Settings / activation
    |--------------------------------------------------------------------------
    */

    public function settings(Request $request, string $guid = '')
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $settings = $this->settingsFor($firm);

        return $this->sendResponse('RECORD_FOUND', [
            'settings' => $settings,
            'firm'     => [
                'guid'         => $firm->guid,
                'firm_name'    => $firm->firm_name,
                'payment_type' => $firm->payment_type,
            ],
        ]);
    }

    /**
     * Set the scheduling parameters payroll needs on top of the firm record.
     *
     * period_anchor_date exists because OrganizationDeadlineService derives
     * Bi-Weekly as now()->addDays(14) — fine for a "next due" widget, unusable
     * as a repeating schedule. Without an anchor there is nothing to count
     * periods from.
     */
    public function activate(Request $request, string $guid = '')
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'period_anchor_date'     => ['nullable', 'date', 'date_format:Y-m-d'],
            'pay_day_offset'         => ['nullable', 'integer', 'min:0', 'max:60'],
            'cutoff_days_before_pay' => ['nullable', 'integer', 'min:0', 'max:60'],
            'default_currency'       => ['nullable', 'string', 'size:3'],
            'export_format'          => ['nullable', Rule::in(['generic_csv', 'xlsx'])],
            'status'                 => ['nullable', Rule::in(Config::get('payroll.settings_status'))],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $settings = $this->settingsFor($firm);

        // The frequency is always the firm record's, never an independent
        // payroll setting — that is the whole point of taking it from
        // firms.payment_type.
        $settings->pay_frequency = $firm->payment_type;

        foreach (['period_anchor_date', 'pay_day_offset', 'cutoff_days_before_pay', 'default_currency', 'export_format'] as $field) {
            if (array_key_exists($field, $validated)) {
                $settings->{$field} = $validated[$field];
            }
        }

        // Only a downgrade is permitted here. Going active is the accept()
        // path, so that activation always has an accepted agreement behind it.
        // Progress indicator only. It cannot switch payroll on or off any more
        // — that is decided by the agreement — so there is no longer a
        // downgrade-only restriction here.
        if (! empty($validated['status'])) {
            $settings->status = $validated['status'];
        }

        $settings->save();

        ActivityLog::record('payroll', "updated payroll settings for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORD_UPDATED', $settings->fresh());
    }

    /*
    |--------------------------------------------------------------------------
    | Agreement lifecycle
    |--------------------------------------------------------------------------
    */

    public function getAll(Request $request, string $guid = '')
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'status'           => ['nullable', Rule::in(Config::get('payroll.agreement_status'))],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $results_per_page = $validated['results_per_page'] ?? Config::get('payroll.filters.results_per_page');
        $page = $validated['page'] ?? Config::get('payroll.filters.page');

        $sql = Agreement::where('firm_id', $firm->id);
        if (! empty($validated['status'])) {
            $sql = $sql->where('status', $validated['status']);
        }
        $sql = $sql->orderByDesc('version');

        $total_results = $sql->count();
        $max = $total_results > 0 ? ceil($total_results / $results_per_page) : 1;
        $offset = (max(1, $page) - 1) * $results_per_page;

        $records = $sql->with('acceptance')->limit($results_per_page)->offset($offset)->get();

        // Display fields for the version-history table: which revision, when it
        // went out, and who it went to. Resolved once for the page rather than
        // per row — every agreement here belongs to the same firm, so the
        // recipient list is identical for all of them.
        $clientNames = User::where('firm_id', $firm->id)->role('Client')->get()
            ->map(fn ($user) => trim($user->first_name . ' ' . $user->last_name))
            ->filter()
            ->values()
            ->all();

        foreach ($records as $record) {
            // The date the accountant posted this version to the client. Null,
            // not a placeholder, while it is still a draft — nothing has been
            // posted yet, and the column it comes from is nullable too.
            $record->posted_date = $record->sent_at?->format('Y-m-d');

            // The client this agreement is for: the firm. Payroll agreements
            // are raised against a business, not against one of its logins.
            $record->client_name = $firm->firm_name;

            // The logins that were actually notified, for a version that went
            // out. Read from the firm's Client users as they stand NOW —
            // notifyFirmClients() targets the same set, but nothing snapshots
            // it at send time, so a login added or removed since is reflected
            // here. Accepted versions carry the real, frozen name on
            // acceptance.accepted_name.
            $record->sent_to = $record->sent_at ? $clientNames : null;
        }

        return $this->sendResponse('RECORDS_FOUND', [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $max,
                'current_page'  => intval($page),
                'num_results'   => count($records),
                'total_results' => $total_results,
            ],
            'data' => $records,
        ]);
    }

    /** The agreement the client should be looking at: awaiting action, else the active one. */
    public function current(Request $request, string $guid = '')
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $agreement = Agreement::where('firm_id', $firm->id)
            ->whereIn('status', ['Sent', 'Agreed'])
            // Something awaiting the client outranks one already agreed.
            ->orderByRaw("FIELD(status, 'Sent', 'Agreed')")
            ->orderByDesc('version')
            ->with('acceptance')
            ->first();

        if (! $agreement) {
            return $this->sendError('AGREEMENT_NOT_FOUND', 200);
        }

        // Opening it is what marks it viewed — that timestamp is part of the
        // audit trail, so it is recorded on the client's first read, not on send.
        if ($agreement->isAwaitingClient() && $this->isFirmClient($firm) && ! $agreement->viewed_at) {
            $agreement->viewed_at = now();
            $agreement->save();
        }

        return $this->sendResponse('RECORD_FOUND', [
            'agreement' => $agreement->fresh('acceptance'),
            'settings'  => $this->settingsFor($firm),
        ]);
    }

    public function view(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $agreement = Agreement::where('firm_id', $firm->id)->where('id', $id)->with('acceptance')->first();
        if (! $agreement) {
            return $this->sendError('AGREEMENT_NOT_FOUND', 404);
        }

        return $this->sendResponse('RECORD_FOUND', $agreement);
    }

    /*
    |--------------------------------------------------------------------------
    | The default agreement template
    |--------------------------------------------------------------------------
    |
    | One template for every client, not one per firm — so these two routes take
    | no {guid}. It is the boilerplate the create form starts from; the
    | accountant edits it here and every agreement drafted afterwards begins
    | from the edited text.
    |
    | Stored in the shared `settings` table under context 'payroll_agreement'
    | with user_id 0, which is this codebase's existing convention for a global
    | row (see 2026_07_03_000003_scope_settings_uniqueness_to_user). No new
    | table, and no migration: the rows come into existence the first time
    | someone saves. Until then config('payroll.default_agreement') answers, so
    | a fresh install serves sensible text with nothing seeded.
    |
    */

    /** Context and keys for the global template rows in `settings`. */
    private const TEMPLATE_CONTEXT = 'payroll_agreement';
    private const TEMPLATE_TITLE_KEY = 'default_title';
    private const TEMPLATE_BODY_KEY = 'default_body';

    /**
     * The template is global, so there is no firm to scope against and
     * authorizeFirmManageAction() cannot be used. This is the same tier minus
     * the per-firm org-permission: Admin yes, Staff never (they cannot raise an
     * agreement either), otherwise the manage-tier permission.
     */
    private function canManageDefaultTemplate(): bool
    {
        $user = auth()->user();

        if (! $user) {
            return false;
        }
        if ($user->hasRole('Admin')) {
            return true;
        }
        if ($user->hasRole('Staff')) {
            return false;
        }

        return $user->can('firms.manage');
    }

    /**
     * The saved template if one exists, otherwise the text shipped in config.
     *
     * Falls back per field rather than all-or-nothing, so a row that only ever
     * had its title saved still gets a body.
     */
    private function resolveDefaultTemplate(): array
    {
        $shipped = Config::get('payroll.default_agreement', []);

        $rows = AppSetting::where('context', self::TEMPLATE_CONTEXT)
            ->where('user_id', 0)
            ->get()
            ->keyBy('key');

        $title = $rows->get(self::TEMPLATE_TITLE_KEY);
        $body = $rows->get(self::TEMPLATE_BODY_KEY);

        return [
            'title' => $title->value ?? $shipped['title'] ?? null,
            'body'  => $body->value ?? $shipped['body'] ?? null,
            // Lets the form offer "reset to the shipped wording" only when
            // there is something to reset, and show when it was last changed.
            'is_customised' => $rows->isNotEmpty(),
            'updated_at'    => $rows->max('updated_at'),
        ];
    }

    /**
     * The boilerplate a new agreement starts from, for prefilling the create
     * form. Read-only — it writes nothing and creates nothing.
     *
     * title/body come back under the same keys create() accepts, so the
     * frontend can post the payload straight back with whatever the accountant
     * edited. create() deliberately does NOT apply this itself: an agreement
     * saved with an empty body is a genuinely empty draft, and silently filling
     * it would make it sendable without anyone having read a word of it.
     */
    public function defaultTemplate(Request $request)
    {
        if (! $this->canManageDefaultTemplate()) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        return $this->sendResponse('RECORD_FOUND', $this->resolveDefaultTemplate());
    }

    /**
     * Replace the template every future agreement starts from.
     *
     * This is a global edit: it changes the starting text for every client, not
     * for one firm. Agreements already drafted are untouched — each one owns its
     * own copy of the text from the moment it is created, which is what keeps a
     * signed agreement from being rewritten underneath the client.
     *
     * Pass reset=true to drop the saved rows and fall back to the wording
     * shipped in config, which is otherwise unreachable once edited.
     */
    public function updateDefaultTemplate(Request $request)
    {
        if (! $this->canManageDefaultTemplate()) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'reset' => ['nullable', 'boolean'],
            'title' => ['nullable', 'string', 'max:255'],
            'body'  => ['nullable', 'string', 'max:65535'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        if (! empty($validated['reset'])) {
            AppSetting::where('context', self::TEMPLATE_CONTEXT)->where('user_id', 0)->delete();

            ActivityLog::record('payroll', 'reset the default payroll agreement template', null, auth()->id());

            return $this->sendResponse('RECORD_UPDATED', $this->resolveDefaultTemplate());
        }

        // Not a reset, so both halves are required — saving a title with no
        // body would leave the template half-shipped and half-edited, which is
        // exactly the ambiguity the per-field fallback exists to survive rather
        // than to encourage.
        $required = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:255'],
            'body'  => ['required', 'string', 'max:65535'],
        ]);

        if ($required->fails()) {
            return $this->sendError($required->errors(), 422);
        }

        $required = $required->validated();

        DB::transaction(function () use ($required) {
            foreach ([self::TEMPLATE_TITLE_KEY => $required['title'], self::TEMPLATE_BODY_KEY => $required['body']] as $key => $value) {
                AppSetting::updateOrCreate(
                    ['context' => self::TEMPLATE_CONTEXT, 'key' => $key, 'user_id' => 0],
                    ['value' => $value]
                );
            }
        });

        ActivityLog::record('payroll', 'updated the default payroll agreement template', null, auth()->id());

        return $this->sendResponse('RECORD_UPDATED', $this->resolveDefaultTemplate());
    }

    public function create(Request $request, string $guid = '')
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }
        if (empty($firm->payment_type)) {
            return $this->sendError('FIRM_PAYMENT_TYPE_NOT_SET', 422);
        }

        $validator = Validator::make($request->all(), $this->contentRules());
        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $this->applyLegacyAliases($validator->validated());
        // 1.0, then +0.1 per revision — 1.9 rolls to 2.0. Server-assigned; a
        // caller cannot choose its own version.
        $version = Agreement::nextVersionFor($firm->id);

        $agreement = Agreement::create([
            'firm_id'            => $firm->id,
            'version'            => $version,
            // Saving is what makes it a draft; it stays one until send().
            'status'             => 'Draft',
            'title'              => $validated['title'] ?? null,
            'body'               => $validated['body'] ?? null,
            'effective_date'     => $validated['effective_date'] ?? null,
            'end_date'           => $validated['end_date'] ?? null,
            'price_type'         => $validated['price_type'] ?? null,
            'price'              => $validated['price'] ?? null,
            'currency'           => $validated['currency'] ?? 'CAD',
            // Snapshot from the firm record. Payroll never defines its own.
            'pay_frequency'      => $firm->payment_type,
            'period_anchor_date' => $validated['period_anchor_date'] ?? null,
            'notes'              => $validated['notes'] ?? null,
            'prepared_by'        => auth()->id(),
        ]);

        Guid::generate('payroll_agreements', 'guid', $firm->firm_name, $agreement->id);
        $agreement = $agreement->fresh();

        // The settings row is no longer touched here: drafting an agreement
        // says nothing about payroll progress, and the agreement's own status
        // is what the client list reads for the setup state.
        $this->settingsFor($firm);

        ActivityLog::record('payroll', "created payroll agreement v{$version} for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORD_CREATED', $agreement);
    }

    /**
     * Edit a draft. Once an agreement is sent the clause set is frozen — a
     * change means a new version, so what the client accepted can never be
     * edited out from under them.
     */
    public function update(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $agreement = Agreement::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $agreement) {
            return $this->sendError('AGREEMENT_NOT_FOUND', 404);
        }
        if (! $agreement->isEditable()) {
            return $this->sendError('AGREEMENT_NOT_EDITABLE', 422);
        }

        $validator = Validator::make($request->all(), $this->contentRules());
        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $this->applyLegacyAliases($validator->validated());

        // Only what was sent is written, so a partial payload edits one field
        // without blanking the rest — including a field reached through its
        // legacy alias, which applyLegacyAliases() has already renamed.
        foreach (array_keys($this->canonicalRules()) as $field) {
            if (array_key_exists($field, $validated)) {
                $agreement->{$field} = $validated[$field];
            }
        }

        $agreement->save();

        ActivityLog::record('payroll', "updated payroll agreement v{$agreement->version} for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('RECORD_UPDATED', $agreement->fresh());
    }

    /**
     * Discard a draft. A hard delete rather than a status change: the table has
     * no soft-delete column, and a draft the client has never seen is not
     * evidence of anything. Everything the client HAS seen is kept — a decline
     * is revised through update() and re-sent, an accepted agreement is ended
     * through terminate().
     */
    public function delete(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $agreement = Agreement::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $agreement) {
            return $this->sendError('AGREEMENT_NOT_FOUND', 404);
        }
        if (! $agreement->isDeletable()) {
            return $this->sendError('AGREEMENT_NOT_DELETABLE', 422);
        }
        // Belt and braces. payroll_agreement_acceptances cascades on delete, so
        // a stray acceptance row would be destroyed silently rather than
        // blocking the delete — neither can exist on a never-sent draft, but
        // the check costs nothing and the data it protects is unrecoverable.
        if ($agreement->acceptance()->exists() || $agreement->signed_file_id) {
            return $this->sendError('AGREEMENT_NOT_DELETABLE', 422);
        }

        $version = $agreement->version;
        $agreement->delete();

        ActivityLog::record('payroll', "deleted payroll agreement v{$version} draft for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('AGREEMENT_DELETED', []);
    }

    public function send(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $agreement = Agreement::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $agreement) {
            return $this->sendError('AGREEMENT_NOT_FOUND', 404);
        }
        // Unsent covers a fresh draft and a declined one being re-sent. The
        // status alone says so — a declined agreement keeps the sent_at of the
        // posting it was declined from.
        if (! $agreement->isUnsent()) {
            return $this->sendError('AGREEMENT_ALREADY_SENT', 422);
        }
        // An agreement has to say something before it can go out. This used to
        // test `terms`, a column real agreements never filled — every one of
        // them put its text in `body`, so sending was refused across the board.
        if (! $agreement->hasContent()) {
            return $this->sendError('AGREEMENT_CONTENT_REQUIRED', 422);
        }

        DB::transaction(function () use ($agreement, $firm) {
            $agreement->status = 'Sent';
            $agreement->sent_at = now();
            // A fresh posting awaits a fresh read: current() only stamps
            // viewed_at when it is null, so a re-sent revision would otherwise
            // keep reading as "already seen" from the previous round.
            $agreement->viewed_at = null;
            $agreement->decline_reason = null;
            $agreement->save();

            $this->notifyFirmClients(
                $firm,
                'Payroll agreement ready to review',
                "A payroll services agreement for {$firm->firm_name} is ready for you to review and accept.",
                'payroll_agreement_sent'
            );
        });

        ActivityLog::record('payroll', "sent payroll agreement v{$agreement->version} to {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('AGREEMENT_SENT', $agreement->fresh());
    }

    /**
     * The client's acceptance. This is the moment payroll opens, so it writes
     * the evidence record and flips payroll_settings in one transaction.
     */
    public function accept(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->isFirmClient($firm)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $agreement = Agreement::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $agreement) {
            return $this->sendError('AGREEMENT_NOT_FOUND', 404);
        }
        if (! $agreement->isAwaitingClient()) {
            return $this->sendError('AGREEMENT_NOT_PENDING_ACCEPTANCE', 422);
        }

        $validator = Validator::make($request->all(), [
            'typed_signature' => ['nullable', 'string', 'max:200'],
            'accepted'        => ['required', 'accepted'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();
        $user = auth()->user();

        DB::transaction(function () use ($agreement, $firm, $user, $validated, $request) {
            $agreement->status = 'Agreed';
            // accepted_at is the only stamp for this now; activated_at held the
            // identical value on every row and was dropped.
            $agreement->accepted_at = now();
            $agreement->save();

            // Any earlier live agreement is superseded, so the "at most one
            // active" rule holds without a partial unique index, which MySQL
            // does not support.
            Agreement::where('firm_id', $firm->id)
                ->where('id', '!=', $agreement->id)
                ->where('status', 'Agreed')
                // Inactive with terminated_at left NULL is what "superseded"
                // now looks like; terminate() is the one that stamps it.
                ->update(['status' => 'Inactive']);

            AgreementAcceptance::create([
                'payroll_agreement_id' => $agreement->id,
                'accepted_by'          => $user->id,
                // Denormalised so the evidence survives the user record being
                // renamed or deleted.
                'accepted_name'        => trim($user->first_name . ' ' . $user->last_name),
                'accepted_email'       => $user->email,
                'accepted_role'        => $user->getRoleNames()->first(),
                'acceptance_method'    => 'portal_checkbox',
                'typed_signature'      => $validated['typed_signature'] ?? null,
                'content_hash'         => Agreement::hashContent($agreement),
                'ip_address'           => $request->ip(),
                'user_agent'           => substr((string) $request->userAgent(), 0, 500),
                'accepted_at'          => now(),
            ]);

            // status is deliberately not touched: it is a progress indicator
            // now, and a firm that has just agreed still has no payroll run, so
            // it stays 'Not Started'. Whether payroll may run is read from the
            // agreement via Setting::isActive().
            $settings = $this->settingsFor($firm);
            $settings->pay_frequency = $agreement->pay_frequency;
            $settings->activated_at = now();
            $settings->activated_by = $user->id;
            $settings->suspended_at = null;
            if ($agreement->period_anchor_date && ! $settings->period_anchor_date) {
                $settings->period_anchor_date = $agreement->period_anchor_date;
            }
            $settings->save();

            $this->notifyFirmStaff(
                $firm,
                'Payroll agreement accepted',
                "{$firm->firm_name} accepted payroll agreement v{$agreement->version}. Payroll is now active.",
                'payroll_agreement_accepted'
            );
        });

        ActivityLog::record('payroll', "accepted payroll agreement v{$agreement->version} for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('AGREEMENT_ACCEPTED', $agreement->fresh('acceptance'));
    }

    public function decline(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->isFirmClient($firm)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $agreement = Agreement::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $agreement) {
            return $this->sendError('AGREEMENT_NOT_FOUND', 404);
        }
        if (! $agreement->isAwaitingClient()) {
            return $this->sendError('AGREEMENT_NOT_PENDING_ACCEPTANCE', 422);
        }

        $validator = Validator::make($request->all(), [
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        DB::transaction(function () use ($agreement, $firm, $validated) {
            // 'Reject' rather than a terminal state: it goes back to the
            // accountant to revise and re-send, and isUnsent() treats Reject as
            // re-sendable off the status alone.
            //
            // sent_at and viewed_at are deliberately NOT cleared here. They
            // used to be, on the reasoning that a null sent_at was what put the
            // agreement back in the accountant's hands — untrue since 'Sent'
            // became its own status on 2026-08-24, and destructive: this version
            // WAS posted on a date and the client DID open it before declining,
            // which is exactly the audit trail the acceptance record exists to
            // preserve for the other outcome. send() resets viewed_at when the
            // revision goes back out.
            $agreement->status = 'Reject';
            $agreement->decline_reason = $validated['reason'];
            $agreement->save();

            $this->notifyFirmStaff(
                $firm,
                'Payroll agreement declined',
                "{$firm->firm_name} declined payroll agreement v{$agreement->version}. Reason: {$validated['reason']}",
                'payroll_agreement_declined'
            );
        });

        ActivityLog::record('payroll', "declined payroll agreement v{$agreement->version} for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('AGREEMENT_DECLINED', $agreement->fresh());
    }

    /**
     * Attach a countersigned PDF. Optional — the acceptance record is the
     * evidence; this is for firms that want a signed document on file too.
     */
    public function uploadSigned(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $agreement = Agreement::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $agreement) {
            return $this->sendError('AGREEMENT_NOT_FOUND', 404);
        }

        $validator = Validator::make($request->all(), [
            'document' => ['required', FileRule::types(['pdf'])->max(10 * 1024)],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        if (! $request->hasFile('document')) {
            return $this->sendError('NO_FILE_PROVIDED', 422);
        }

        $uploadedFile = $request->file('document');
        $extension = $uploadedFile->extension();
        $name = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
        $file_name = Str::slug($name) . '.' . $extension;

        // Reuses the existing 'agreement' files.group, so no enum migration and
        // so Files::isAgreementForUsersFirm() semantics stay familiar.
        $data = (new Files())->store(
            $request,
            $uploadedFile,
            'agreement',
            $file_name,
            'payroll/' . $firm->guid . '/agreements'
        );

        $agreement->signed_file_id = $data['file_id'];
        $agreement->save();

        ActivityLog::record('payroll', "uploaded signed payroll agreement v{$agreement->version} for {$firm->firm_name}", $data['file_id'], auth()->id());

        return $this->sendResponse('FILES_UPLOADED', $agreement->fresh());
    }

    public function terminate(Request $request, string $guid = '', int $id = 0)
    {
        $firm = $this->firm($guid);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'firms.manage', 'manage_payroll')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $agreement = Agreement::where('firm_id', $firm->id)->where('id', $id)->first();
        if (! $agreement) {
            return $this->sendError('AGREEMENT_NOT_FOUND', 404);
        }
        if (! $agreement->isAgreed()) {
            return $this->sendError('AGREEMENT_NOT_ACTIVE', 422);
        }

        $validator = Validator::make($request->all(), [
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        DB::transaction(function () use ($agreement, $firm, $validated) {
            $agreement->status = 'Inactive';
            $agreement->terminated_at = now();
            $agreement->notes = trim(($agreement->notes ? $agreement->notes . "\n" : '') . 'Terminated: ' . ($validated['reason'] ?? 'no reason given'));
            $agreement->save();

            // The agreement going Inactive is what stops payroll; suspended_at
            // records when. settings.status is left alone — it tracks run
            // progress, not activation.
            $settings = $this->settingsFor($firm);
            $settings->suspended_at = now();
            $settings->save();

            $this->notifyFirmClients(
                $firm,
                'Payroll agreement terminated',
                "The payroll services agreement for {$firm->firm_name} has been terminated. New payroll cannot be submitted.",
                'payroll_agreement_terminated'
            );
        });

        ActivityLog::record('payroll', "terminated payroll agreement v{$agreement->version} for {$firm->firm_name}", null, auth()->id());

        return $this->sendResponse('AGREEMENT_TERMINATED', $agreement->fresh());
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    /**
     * Shared by create() and update(). Every field is nullable — a draft is
     * built up over several saves, and completeness is enforced at send()
     * rather than on each keystroke.
     *
     * One column per fact since 2026-08-25: the fee lives in price/price_type,
     * the start date in effective_date, the text in title/body. The names those
     * replaced are still accepted as input; see contentRules() below.
     */
    private function canonicalRules(): array
    {
        return [
            'title'              => ['nullable', 'string', 'max:255'],
            'body'               => ['nullable', 'string', 'max:65535'],
            'effective_date'     => ['nullable', 'date', 'date_format:Y-m-d'],
            'end_date'           => ['nullable', 'date', 'date_format:Y-m-d', 'after_or_equal:effective_date'],
            'price_type'         => ['nullable', Rule::in(Config::get('payroll.price_types'))],
            'price'              => ['nullable', 'numeric', 'min:0'],
            'currency'           => ['nullable', 'string', 'size:3'],
            'period_anchor_date' => ['nullable', 'date', 'date_format:Y-m-d'],
            'notes'              => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * The retired column names, still accepted on input so a caller that has
     * not moved over yet keeps working. They are validated under their OLD
     * rules — a bad legacy value must 422 rather than be silently dropped on
     * the way through applyLegacyAliases() — and never appear in a response.
     */
    private function legacyRules(): array
    {
        return [
            'service_start_date'  => ['nullable', 'date', 'date_format:Y-m-d'],
            'service_end_date'    => ['nullable', 'date', 'date_format:Y-m-d', 'after_or_equal:service_start_date'],
            'fee_amount'          => ['nullable', 'numeric', 'min:0'],
            'fee_currency'        => ['nullable', 'string', 'size:3'],
            'fee_basis'           => ['nullable', Rule::in(Config::get('payroll.legacy_fee_basis'))],
            'terms'               => ['nullable', 'array'],
            'terms.*'             => ['nullable', 'string', 'max:5000'],
            'included_services'   => ['nullable', 'array'],
            'included_services.*' => ['nullable', 'string', 'max:255'],
        ];
    }

    private function contentRules(): array
    {
        return $this->canonicalRules() + $this->legacyRules();
    }

    /**
     * Retired name => surviving name. fee_basis and the JSON content pair are
     * absent because they need a value translation, not a straight rename;
     * applyLegacyAliases() handles those two by hand.
     */
    private const LEGACY_INPUT_ALIASES = [
        'service_start_date' => 'effective_date',
        'service_end_date'   => 'end_date',
        'fee_amount'         => 'price',
        'fee_currency'       => 'currency',
    ];

    /** fee_basis had a third option price_type has no word for; see the migration. */
    private const LEGACY_FEE_BASIS_MAP = [
        'per_employee_per_run' => 'per person',
        'per_pay_run'          => 'total per run',
    ];

    /**
     * Fold any legacy keys onto the column that survived, then drop them.
     *
     * A canonical key always wins: a caller sending both `price` and
     * `fee_amount` means the new one, and silently preferring the legacy value
     * would be the worse surprise of the two.
     */
    private function applyLegacyAliases(array $validated): array
    {
        foreach (self::LEGACY_INPUT_ALIASES as $legacy => $canonical) {
            if (array_key_exists($legacy, $validated) && ! array_key_exists($canonical, $validated)) {
                $validated[$canonical] = $validated[$legacy];
            }
            unset($validated[$legacy]);
        }

        if (array_key_exists('fee_basis', $validated)) {
            if (! array_key_exists('price_type', $validated)) {
                // 'monthly_flat' has no price_type equivalent, so it maps to
                // null — the amount still lands in `price`.
                $validated['price_type'] = self::LEGACY_FEE_BASIS_MAP[$validated['fee_basis']] ?? null;
            }
            unset($validated['fee_basis']);
        }

        $flattened = $this->flattenLegacyContent($validated['terms'] ?? null, $validated['included_services'] ?? null);

        if ($flattened !== '' && empty($validated['body'])) {
            $validated['body'] = $flattened;
        }

        unset($validated['terms'], $validated['included_services']);

        return $validated;
    }

    /** The retired JSON content pair as the prose `body` now holds. */
    private function flattenLegacyContent(?array $terms, ?array $includedServices): string
    {
        $lines = [];

        foreach ((array) $terms as $key => $value) {
            if (is_scalar($value)) {
                $lines[] = ucfirst(str_replace('_', ' ', (string) $key)) . ': ' . $value;
            }
        }

        $services = array_filter((array) $includedServices, 'is_scalar');

        if ($services !== []) {
            $lines[] = 'Included services: ' . implode(', ', $services);
        }

        return implode("\n", $lines);
    }

    private function notifyFirmClients(Firm $firm, string $title, string $message, string $type): void
    {
        $recipients = User::where('firm_id', $firm->id)->role('Client')->get();

        foreach ($recipients as $recipient) {
            Notification::record($recipient->id, $title, $message, $type, auth()->id());
        }
    }

    private function notifyFirmStaff(Firm $firm, string $title, string $message, string $type): void
    {
        $assignedAccountantIds = OrganizationUserAssignment::where('firm_id', $firm->id)->pluck('user_id');

        $recipients = User::role('Admin')->get()
            ->merge(User::whereIn('id', $assignedAccountantIds)->role('Accountant')->get())
            ->unique('id');

        foreach ($recipients as $recipient) {
            Notification::record($recipient->id, $title, $message, $type, auth()->id());
        }
    }
}
