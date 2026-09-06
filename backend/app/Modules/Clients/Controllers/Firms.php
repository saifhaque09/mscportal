<?php

namespace App\Modules\Clients\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use Validator;

use App\Http\Controllers\BaseController;
use App\Modules\Clients\Controllers\Checklists;
use App\Modules\Clients\Models\Firm;
use App\Modules\Clients\Models\Invite;
use App\Models\User;
use App\Helpers\Guid;
use App\Mail\CreateFirm;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Notifications\Models\Notification;
use App\Modules\Files\Controllers\Files;
use App\Services\OrganizationDeadlineService;
use App\Services\FirmDuplicateService;
use App\Modules\Organizations\Models\OrganizationUserAssignment;


class Firms extends BaseController {

    public function __construct(
        private OrganizationDeadlineService $deadlineService,
        private FirmDuplicateService $duplicateService,
    ) {}

    // Admin-only, per original intent. The role-assignment issue referenced
    // below was the Roles::store() guard_name mismatch ('api' vs the app's
    // actual 'web' default guard) — fixed, so this gate is safe to re-enable.
    private function requireAdmin()
    {
        if (! auth()->user()->hasRole('Admin')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }
        return null;
    }

    /**
     * Some callers send financial_year_end_month/financial_year_end_day as
     * flat top-level fields instead of the nested financial_year_end[month]/
     * financial_year_end[day] structure validated below. Fold the flat keys
     * into the nested array (only when the nested form wasn't already sent)
     * so both payload shapes work.
     */
    private function normalizeFinancialYearEnd(array $input): array
    {
        if (! isset($input['financial_year_end']) &&
            (isset($input['financial_year_end_month']) || isset($input['financial_year_end_day']))
        ) {
            $input['financial_year_end'] = [
                'month' => $input['financial_year_end_month'] ?? null,
                'day'   => $input['financial_year_end_day']   ?? null,
            ];
        }

        return $input;
    }

    /**
     * GET /clients/business/duplicates
     * Report firms sharing the same firm_name + contact_email, with what's attached to each.
     */
    public function duplicates(Request $request)
    {
        if ($error = $this->requireAdmin()) {
            return $error;
        }

        $groups = $this->duplicateService->findDuplicateGroups();

        if ($groups->isEmpty()) {
            return $this->sendError('NO_DUPLICATES_FOUND', 200);
        }

        return $this->sendResponse('RECORDS_FOUND', $groups->values());
    }

    /**
     * POST /clients/business/duplicates/delete-empty
     * Soft-delete duplicate firms that have zero related records anywhere. Reversible via /business/restore.
     */
    public function deleteEmptyDuplicates(Request $request)
    {
        if ($error = $this->requireAdmin()) {
            return $error;
        }

        $deleted = $this->duplicateService->deleteEmptyDuplicates();

        return $this->sendResponse('RECORDS_DELETED', [
            'deleted_firm_ids' => $deleted,
            'count'            => count($deleted),
        ]);
    }

    /**
     * POST /clients/business/duplicates/merge
     * Move every related record from the given duplicate firm ids onto the canonical firm id,
     * then soft-delete the duplicates. Requires an explicit canonical_id — never auto-selected.
     */
    public function mergeDuplicates(Request $request)
    {
        if ($error = $this->requireAdmin()) {
            return $error;
        }

        $rules = [
            'canonical_id'   => ['required', 'integer', 'exists:firms,id'],
            'duplicate_ids'  => ['required', 'array', 'min:1'],
            'duplicate_ids.*' => ['integer', 'exists:firms,id', 'different:canonical_id'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $result = $this->duplicateService->merge($validated['canonical_id'], $validated['duplicate_ids']);

        ActivityLog::record(
            'firms',
            "merged duplicate firm(s) [" . implode(',', $result['deleted']) . "] into firm #{$validated['canonical_id']}",
            null,
            auth()->id()
        );

        return $this->sendResponse('RECORDS_MERGED', $result);
    }

    /**
     * Create new business
     *
     */
    public function create (Request $request)
    {
        // Admin-only, per business rule: Admin creates the firm, then
        // separately assigns an Accountant to it with a specific org-role
        // (see organizations/firms/{guid}/members/assign) — firm creation
        // itself is not delegated to Accountant/Staff even though they hold
        // firms.manage for editing/listing.
        if ($error = $this->requireAdmin()) {
            return $error;
        }

        $rules = [
            'firm_name' => ['required', 'string', 'max:255'],
            'contact_email' => ['nullable', 'string', 'lowercase', 'email', 'max:255'],
            'contact_mobile' => ['nullable', 'numeric'],
            'province' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string'],
            'postal' => ['nullable', 'string',],
            'country_name' => ['nullable', 'string',],
            'country_code' => ['nullable', 'string',],
            'address' => ['required', 'string', 'max:255'],
            'payment_type' => ['nullable', 'string', 'in:Monthly,Semi-Monthly,Bi-Weekly,Weekly,Bi-Monthly,Annual,Quarterly'],
            'weekly_day' => ['nullable', 'integer', 'min:1', 'max:31'],
            'weekly_month' => ['nullable', 'string', 'max:20'],
            'business_account_details' => ['nullable', 'array'],
            'business_account_details.*' => ['nullable', 'string'],
            'gst_number' => ['nullable', 'string'],
            'hst_number' => ['nullable', 'string'],
            'pst_number' => ['nullable', 'string'],
            'tax_returns_due_date' => ['nullable', 'date'],
            'business_categories' => ['nullable', 'array'],
            'business_categories.*' => ['nullable', 'string'],
            'tax_return' => ['nullable', 'array'],
            'tax_return.occurance' => ['nullable', 'in:yearly,quarterly,monthly'],
            'tax_return.month' => ['nullable', 'required_if:tax_return.occurance,yearly'],
            'tax_return.day' => ['nullable', 'required_if:tax_return.occurance,yearly'],
            'financial_year_end' => ['nullable', 'array'],
            'financial_year_end.month' => ['nullable', 'required_with:financial_year_end.day', 'numeric', 'gte:1', 'lte:12'],
            'financial_year_end.day' => ['nullable', 'required_with:financial_year_end.month', 'numeric', 'gte:1', 'lte:31'],
            'gst_hst_date' => ['nullable', 'array'],
            'gst_hst_date.month' => ['nullable', 'required_with:gst_hst_date.day', 'numeric', 'gte:1', 'lte:12'],
            'gst_hst_date.day' => ['nullable', 'required_with:gst_hst_date.month', 'numeric', 'gte:1', 'lte:31'],
        ];

        $input = $this->normalizeFinancialYearEnd($request->all());

        $validator = Validator::make($input, $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();

            $duplicate = Firm::where('firm_name', $validated['firm_name'])
                ->where('contact_email', $validated['contact_email'] ?? null)
                ->whereNull('deleted_at')
                ->exists();

            if ($duplicate) {
                return $this->sendError('A business with this name and contact email already exists.');
            }

            $data = [
                'guid' => Str::random(8),
                // New firms start in draft — hidden from Accountant/Staff
                // client lists until someone (an Accountant or Admin) is
                // assigned, at which point Organizations\Firms::assignRole()
                // flips this to 'active'.
                'status' => 'draft',
                'firm_name' => $validated['firm_name'],
                'contact_email' => isset($validated['contact_email']) ? $validated['contact_email'] : NULL,
                'contact_mobile' => isset($validated['contact_mobile']) ? $validated['contact_mobile'] : NULL,
                'province' => isset($validated['province']) ? $validated['province'] : NULL,
                'city' => isset($validated['city']) ? $validated['city'] : NULL,
                'postal' => isset($validated['postal']) ? $validated['postal'] : NULL,
                'country_name' => isset($validated['country_name']) ? $validated['country_name'] : NULL,
                'country_code' => isset($validated['country_code']) ? $validated['country_code'] : NULL,
                'address' => isset($validated['address']) ? $validated['address'] : NULL,
                'payment_type' => isset($validated['payment_type']) ? $validated['payment_type'] : NULL,
                'weekly_day' => isset($validated['weekly_day']) ? $validated['weekly_day'] : NULL,
                'weekly_month' => isset($validated['weekly_month']) ? $validated['weekly_month'] : NULL,
                'business_account_details' => isset($validated['business_account_details']) ? $validated['business_account_details'] : NULL,
                'gst_number' => isset($validated['gst_number']) ? $validated['gst_number'] : NULL,
                'hst_number' => isset($validated['hst_number']) ? $validated['hst_number'] : NULL,
                'pst_number' => isset($validated['pst_number']) ? $validated['pst_number'] : NULL,
                'tax_return' => isset($validated['tax_return']) ? $validated['tax_return'] : NULL,
                'financial_year_end' => isset($validated['financial_year_end']) ? $validated['financial_year_end'] : NULL,
                'gst_hst_date' => isset($validated['gst_hst_date']) ? $validated['gst_hst_date'] : NULL,
                'tax_returns_due_date' => isset($validated['tax_returns_due_date']) ? $validated['tax_returns_due_date'] : NULL,
                'business_categories' => isset($validated['business_categories']) ? $validated['business_categories'] : NULL,
            ];

            $firm = Firm::create($data);
            Guid::generate ('firms', 'guid', $data['firm_name'], $firm->id);

            // No auto-assignment here: the creator is always Admin (gated
            // above), who bypasses every permission/org-assignment check
            // already — an org-role row for them would be inert bookkeeping.
            // Admin assigns an Accountant to this firm as a separate,
            // deliberate step via organizations/firms/{guid}/members/assign.

            // contact_email is nullable — sending is optional, not a hard
            // requirement of creating a firm.
            if (! empty($validated['contact_email'])) {
                $msg = [
                    'firm_name' => $data['firm_name'],
                ];
                Mail::to($validated['contact_email'])->send(new CreateFirm($msg));
            }

            $firm = $firm->fresh();

            $this->deadlineService->generate($firm);

            ActivityLog::record('firms', "created {$firm->firm_name}", null, auth()->id());

            return $this->sendResponse ('RECORD_CREATED', $firm);
        }
    }

    /**
     * Edit business
     *
     */
    public function edit (Request $request, string $guid='')
    {
        $firm = Firm::where ('guid', $guid)->first();

        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'firms.manage', 'manage_business_client')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $rules = [
            'firm_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'string', 'lowercase', 'email', 'max:255'],
            'contact_mobile' => ['nullable', 'numeric'],
            'province' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string'],
            'postal' => ['nullable', 'string',],
            'country_name' => ['nullable', 'string',],
            'country_code' => ['nullable', 'string',],
            'address' => ['nullable', 'string', 'max:255'],
            'payment_type' => ['nullable', 'string', 'in:Monthly,Semi-Monthly,Bi-Weekly,Weekly,Bi-Monthly,Annual,Quarterly'],
            'weekly_day' => ['nullable', 'integer', 'min:1', 'max:31'],
            'weekly_month' => ['nullable', 'string', 'max:20'],
            'business_account_details' => ['nullable', 'array'],
            'business_account_details.*' => ['nullable', 'string'],
            'gst_number' => ['nullable', 'string'],
            'hst_number' => ['nullable', 'string'],
            'pst_number' => ['nullable', 'string'],
            'tax_returns_due_date' => ['nullable', 'date'],
            'business_categories' => ['nullable', 'array'],
            'business_categories.*' => ['nullable', 'string'],
            'tax_return' => ['nullable', 'array'],
            'tax_return.occurance' => ['nullable', 'in:yearly,quarterly,monthly'],
            'tax_return.month' => ['nullable', 'required_if:tax_return.occurance,yearly', 'numeric', 'gte:1', 'lte:12'],
            'tax_return.day' => ['nullable', 'required_if:tax_return.occurance,yearly', 'numeric', 'gte:1', 'lte:31'],
            'financial_year_end' => ['nullable', 'array'],
            'financial_year_end.month' => ['nullable', 'required_with:financial_year_end.day', 'numeric', 'gte:1', 'lte:12'],
            'financial_year_end.day' => ['nullable', 'required_with:financial_year_end.month', 'numeric', 'gte:1', 'lte:31'],
            'gst_hst_date' => ['nullable', 'array'],
            'gst_hst_date.month' => ['nullable', 'required_with:gst_hst_date.day', 'numeric', 'gte:1', 'lte:12'],
            'gst_hst_date.day' => ['nullable', 'required_with:gst_hst_date.month', 'numeric', 'gte:1', 'lte:31'],
        ];

        $input = $this->normalizeFinancialYearEnd($request->all());

        $validator = Validator::make($input, $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();

            $data = [
                'firm_name' => isset($validated['firm_name']) ? $validated['firm_name'] : $firm->firm_name,
                // array_key_exists, not isset: contact_email is optional and
                // clearable — sending it empty/null must actually remove it,
                // where isset() would silently keep the stored value.
                'contact_email' => array_key_exists('contact_email', $validated) ? $validated['contact_email'] : $firm->contact_email,
                'contact_mobile' => isset($validated['contact_mobile']) ? $validated['contact_mobile'] : $firm->contact_mobile,
                'province' => isset($validated['province']) ? $validated['province'] : $firm->province,
                'city' => isset($validated['city']) ? $validated['city'] : $firm->city,
                'postal' => isset($validated['postal']) ? $validated['postal'] : $firm->postal,
                'country_name' => isset($validated['country_name']) ? $validated['country_name'] : $firm->country_name,
                'country_code' => isset($validated['country_code']) ? $validated['country_code'] : $firm->country_code,
                'address' => isset($validated['address']) ? $validated['address'] : $firm->address,
                'payment_type' => isset($validated['payment_type']) ? $validated['payment_type'] : $firm->payment_type,
                'weekly_day' => isset($validated['weekly_day']) ? $validated['weekly_day'] : $firm->weekly_day,
                'weekly_month' => isset($validated['weekly_month']) ? $validated['weekly_month'] : $firm->weekly_month,
                'business_account_details' => isset($validated['business_account_details']) ? $validated['business_account_details'] : $firm->business_account_details,
                'gst_number' => isset($validated['gst_number']) ? $validated['gst_number'] : $firm->gst_number,
                'hst_number' => isset($validated['hst_number']) ? $validated['hst_number'] : $firm->hst_number,
                'pst_number' => isset($validated['pst_number']) ? $validated['pst_number'] : $firm->pst_number,
                'tax_return' => isset($validated['tax_return']) ? $validated['tax_return'] : $firm->tax_return,
                'financial_year_end' => isset($validated['financial_year_end']) ? $validated['financial_year_end'] : $firm->financial_year_end,
                'gst_hst_date' => isset($validated['gst_hst_date']) ? $validated['gst_hst_date'] : $firm->gst_hst_date,
                'tax_returns_due_date' => isset($validated['tax_returns_due_date']) ? $validated['tax_returns_due_date'] : $firm->tax_returns_due_date,
                'business_categories' => isset($validated['business_categories']) ? $validated['business_categories'] : $firm->business_categories,
            ];

            $firm->update($data);
            $firm = $firm->fresh();

            $this->deadlineService->generate($firm);

            ActivityLog::record('firm', "updated {$firm->firm_name} firm", null, auth()->id());

            $this->notifyFirmEdited($firm);

            return $this->sendResponse ('RECORD_UPDATED', $firm);
        }
    }

    /**
     * Notify everyone with a stake in this firm that its details changed:
     * every Admin, every Accountant (neither is scoped to a specific firm today),
     * and this firm's own Client user(s) via users.firm_id.
     */
    private function notifyFirmEdited(Firm $firm): void
    {
        $recipients = User::role('Admin')->get()
            ->merge(User::role('Accountant')->get())
            ->merge(User::where('firm_id', $firm->id)->role('Client')->get())
            ->unique('id');

        foreach ($recipients as $recipient) {
            Notification::record(
                $recipient->id,
                'Firm updated',
                "The firm \"{$firm->firm_name}\" details have been updated.",
                'firm_updated',
                auth()->id()
            );
        }
    }

    /**
     * Upload/replace the firm's own logo. Same access as view() — Admin,
     * an org-linked Accountant/Staff (access_business_account), or the
     * firm's own Client login. Staff itself stays read-only (blockStaffWrite).
     */
    public function uploadLogo (Request $request, string $guid='')
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'access_business_account', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $allowed = Config::get('files.allowed_types.image');
        $max     = Config::get('files.max_upload_size');

        $rules = [
            'logo' => ['required', File::types($allowed)->max($max)],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $files = new Files();

        // Replace: remove the previous logo file (if any) before storing the new one.
        if ($firm->logo_file_id) {
            $this->deleteLogoFile($firm->logo_file_id);
        }

        $uploadedFile = $request->file('logo');
        $extension    = $uploadedFile->extension();
        $name         = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
        $file_name    = Str::slug($name) . '.' . $extension;
        $path         = 'business/' . $firm->guid . '/logo';

        $data = $files->store($request, $uploadedFile, 'logo', $file_name, $path);

        $firm->update(['logo_file_id' => $data['file_id']]);
        $firm = $firm->fresh();

        ActivityLog::record('firm', "updated {$firm->firm_name} logo", null, auth()->id());

        return $this->sendResponse('FILE_UPLOADED', $firm);
    }

    /**
     * View the firm's current logo URL (no upload, just a read).
     */
    public function getLogo (Request $request, string $guid='')
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        if (! $firm->logo_file_id) {
            return $this->sendError('LOGO_NOT_FOUND', 200);
        }

        return $this->sendResponse('FILE_FOUND', ['logo_url' => $firm->logo_url]);
    }

    /**
     * Remove the firm's logo. Same access as uploadLogo()/view().
     */
    public function deleteLogo (Request $request, string $guid='')
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'access_business_account', blockStaffWrite: true)) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        if (! $firm->logo_file_id) {
            return $this->sendError('LOGO_NOT_FOUND', 200);
        }

        $this->deleteLogoFile($firm->logo_file_id);
        $firm->update(['logo_file_id' => null]);

        ActivityLog::record('firm', "removed {$firm->firm_name} logo", null, auth()->id());

        return $this->sendResponse('LOGO_DELETED');
    }

    /**
     * Delete a logo's S3 object + files row. Uses the s3 disk directly rather
     * than Files::delete(), which unlinks from the default local disk instead
     * of the disk the file actually lives on.
     */
    private function deleteLogoFile (int $fileId): void
    {
        $path = DB::table('files')->where('id', $fileId)->value('file_path');
        if ($path) {
            Storage::disk('s3')->delete($path);
        }
        (new Files())->unlink($fileId);
    }

    /**
     * Lightweight firm directory (name + client email only), scoped by role:
     * Admin sees every firm; Accountant/Staff see only firms they're
     * assigned to via an active org role granting access_business_account —
     * same scoping rule as getAll(), just without pagination/checklist data.
     * Optional `search` narrows by name/email/mobile/city.
     */
    public function list(Request $request)
    {
        if (! auth()->user()->can('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $rules = [
            'search' => ['nullable', 'string'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $search = $validator->validated()['search'] ?? '';

        $sql = Firm::query();
        if ($search !== '') {
            $sql = $sql->whereAny(['firm_name', 'contact_email', 'contact_mobile', 'city'], 'like', "%$search%");
        }

        if (! auth()->user()->hasRole('Admin')) {
            $assignedFirmIds = OrganizationUserAssignment::where('user_id', auth()->id())
                ->whereHas('organizationRole', function ($query) {
                    $query->where('status', 'active')
                        ->whereHas('permissions', function ($permQuery) {
                            $permQuery->where('code', 'access_business_account')->where('status', 'active');
                        });
                })
                ->pluck('firm_id');
            $sql = $sql->whereIn('id', $assignedFirmIds)->where('status', 'active');
        }

        $firms = $sql->orderBy('firm_name')->get(['id', 'guid', 'firm_name', 'contact_email']);

        return $this->sendResponse('RECORDS_FOUND', $firms);
    }

    // Get all records
    public function getAll (Request $request) {

        if (! auth()->user()->can('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $filters = Config::get('clients.filters');
        $order_by = Config::get('clients.order_by');

        $rules = [
			'search' => ['nullable', 'string'],
			'results_per_page' => ['nullable', 'numeric'],
			'page' => ['nullable', 'numeric'],
			'order_by' => ['nullable', 'string', Rule::in($order_by)],
		];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated          = $validator->validated();
            $results_per_page 	= $filters['results_per_page'];
            $search 			= $filters['search'];
            $page 				= $filters['page'];
            $offset 			= $filters['offset'];

            $results_per_page = ( ! isset($validated['results_per_page'])) ? $results_per_page : $validated['results_per_page'];
            $search = ( ! isset($validated['search'])) ? $search : $validated['search'];
            $page = ( ! isset($validated['page'])) ? $page : $validated['page'];
            $order_by = ( ! isset($validated['order_by'])) ? $order_by : $validated['order_by'];
            
            // Search covers the organisation's client email as well as its own
            // columns. The client email is not a column on firms — it lives on
            // the pending invite or on the registered Client user (same two
            // sources as the client_email field attached below), so it needs
            // two orWhereHas rather than another entry in the whereAny list.
            // contact_email stays searchable: it is no longer collected on
            // create/edit, but existing rows still have it populated.
            // The whole thing is wrapped in one where() group so the OR
            // branches can't leak past the assignment/status filters below.
            $sql = Firm::where(function ($q) use ($search) {
                $q->whereAny(['firm_name', 'contact_email', 'contact_mobile', 'city'], 'like', "%$search%")
                    ->orWhereHas('users', fn ($uq) => $uq->role('Client')->where('email', 'like', "%$search%"))
                    ->orWhereHas('invites', fn ($iq) => $iq->where('role', 'Client')->where('email', 'like', "%$search%"));
            });

            // Non-Admin staff only see firms they're actually assigned to
            // (an org role granting access_business_account), and only once
            // they're out of draft — Admin sees everything, drafts included.
            if (! auth()->user()->hasRole('Admin')) {
                $assignedFirmIds = OrganizationUserAssignment::where('user_id', auth()->id())
                    ->whereHas('organizationRole', function ($query) {
                        $query->where('status', 'active')
                            ->whereHas('permissions', function ($permQuery) {
                                $permQuery->where('code', 'access_business_account')->where('status', 'active');
                            });
                    })
                    ->pluck('firm_id');
                $sql = $sql->whereIn('id', $assignedFirmIds)->where('status', 'active');
            }

            // Pagination
            $total_results = $sql->count ();
            $max = ceil ($total_results / $results_per_page);
            for ($i=1; $i<=$max; $i++) {
                if ($i == $page) {
                    $offset = ($i-1) * $results_per_page;
                }
            }
            $sql->with('checklist_items');
            $records = $sql->limit($results_per_page)->offset($offset)->get();

            // The organisation's client email. contact_email is no longer
            // collected when adding/editing an organisation — the client email
            // now arrives via clients/business/{guid}/invites/send, and lives
            // in exactly one of two places at a time: the invites row while the
            // invite is pending, and the users row once it's accepted
            // (Passwords::create_password() deletes the invite on acceptance).
            // Both lookups are batched for the whole page so this doesn't add
            // another per-firm query on top of the usercount one below.
            $firmIds = $records->pluck('id')->all();

            // pluck() keeps the LAST row it sees for a duplicate key, so order
            // descending to make the lowest id — the firm's first invited
            // client — the one that wins when a firm has several.
            $clientUserEmails   = User::whereIn('firm_id', $firmIds)->role('Client')
                                    ->orderByDesc('id')->pluck('email', 'firm_id');
            $clientInviteEmails = Invite::whereIn('firm_id', $firmIds)->where('role', 'Client')
                                    ->orderByDesc('id')->pluck('email', 'firm_id');

            if ($records) {
                foreach ($records as $i=>$firm) {
                    $reminderDate = NULL;
                    if (isset ($firm->tax_return)) {
                        $tax_return = $firm->tax_return;
                        if (isset ($tax_return['occurance'])) {
                            $tax_occurance = $tax_return['occurance'];
                            if ($tax_occurance == 'monthly') {
                                $lastDayOfMonth = Carbon::now()->endOfMonth();
                                $reminderDate = $lastDayOfMonth->copy()->subDays(15);
                                // If reminder already passed → move to next month
                                if ($reminderDate->isPast()) {
                                    $lastDayOfMonth = Carbon::now()->addMonth()->endOfMonth();
                                    $reminderDate = $lastDayOfMonth->copy()->subDays(15);
                                }
                            }
                            if ($tax_occurance == 'quarter') {
                                $lastDayOfMonth = Carbon::now()->endOfQuarter();
                                $reminderDate = $lastDayOfMonth->copy()->subDays(15);
                                // If reminder already passed → move to next quarter
                                if ($reminderDate->isPast()) {
                                    $lastDayOfMonth = Carbon::now()->addQuarter()->endOfQuarter();
                                    $reminderDate = $lastDayOfMonth->copy()->subDays(15);
                                }
                            }
                            if ($tax_occurance == 'yearly') 
                            {
                                $month = $tax_return['month'];
                                $day = $tax_return['day'];
                                $year = Carbon::now()->year;
                                $lastDayOfMonth = Carbon::create($year, $month, $day);
                                // If date already passed → move to next year
                                if ($lastDayOfMonth->isPast()) {
                                $lastDayOfMonth->addYear();
                                }
                                $reminderDate = $lastDayOfMonth->subDays(15);
                            }
                        }
                    }
                    $firm->reminder_date = $reminderDate;

                    // Get file count for business checklist items
                    $fileCount = 0;
                    $newFiles = 0;
                    //foreach ($firm->checklist_items as $item) {
                        // Get file count for level 2 checklist item
                        $chl = new Checklists();
                        $fc = $chl->getFilesCount($firm->checklist_items);
                        $firm->file_count = $fc->sum('files_count');
                        $firm->new_files = $fc->sum('is_new');
                    //}

                    // Count of this firm's Client + Employee users.
                    $firm->usercount = User::where('firm_id', $firm->id)->role(['Client', 'Employee'])->count();

                    // A registered client wins over a still-pending invite;
                    // null when the organisation has no client yet.
                    $firm->client_email = $clientUserEmails[$firm->id]
                        ?? $clientInviteEmails[$firm->id]
                        ?? NULL;
                }
            }

            $num_results = count($records);
            $payload = [
                'meta' => [
                    'first_page' 			=> 1,
                    'last_page' 			=> $max,
                    'current_page'			=> intval($page),
                    'num_results'			=> $num_results,
                    'total_results'			=> $total_results,
                ],
                'data' => $records,
            ];

            // An empty result set is a valid, successful response — not an
            // error — so the frontend doesn't have to special-case it to
            // avoid showing a spurious "failed to fetch" notification.
            return $this->sendResponse ('RECORDS_FOUND', $payload);

        }
    }

    // Get single record
	public function view (Request $request, string $guid='') {

        $firm = Firm::where ('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError ('RECORDS_NOT_FOUND', 200);
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'access_business_account')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }
        if ( ($firm) ) {
            $reminderDate = NULL;
            if (isset ($firm->tax_return)) {
                $tax_return = $firm->tax_return;
                if (isset ($tax_return['occurance'])) {
                    $tax_occurance = $tax_return['occurance'];
                    if ($tax_occurance == 'monthly') {
                        $lastDayOfMonth = Carbon::now()->endOfMonth();
                        $reminderDate = $lastDayOfMonth->subDays(15);
                    }
                    if ($tax_occurance == 'quarter') {
                        $lastDayOfMonth = Carbon::now()->endOfQuarter();
                        $reminderDate = $lastDayOfMonth->subDays(15);
                    }
                    if ($tax_occurance == 'yearly') {
                        $month = $tax_return['month'];
                        $day = $tax_return['day'];
                        $lastDayOfMonth = Carbon::createFromDate(null, $month, $day);
                        $reminderDate = $lastDayOfMonth->subDays(15);
                    }
                }
            }
            $firm->reminder_date = $reminderDate;

            // The organisation's client email — same two sources and the same
            // precedence as clients/business/all: the registered Client user
            // first, else the still-pending invite, else NULL. contact_email is
            // no longer collected on create/edit, so this is what the screen
            // has to show. Single firm here, so two plain lookups; value()
            // yields NULL on no match and orderBy('id') makes the firm's first
            // invited client the one that wins when there are several.
            $firm->client_email = User::where('firm_id', $firm->id)->role('Client')
                    ->orderBy('id')->value('email')
                ?? Invite::where('firm_id', $firm->id)->where('role', 'Client')
                    ->orderBy('id')->value('email');

            return $this->sendResponse ('RECORDS_FOUND', $firm);
        } else {
            return $this->sendError ('RECORDS_NOT_FOUND', 200);
        }
    }

    // Change status
	public function status (Request $request) {

	    if (! auth()->user()->can('users.manage-status')) {
	        return $this->sendError('UNAUTHORIZED', 403);
	    }

	    $statuses = Config::get ('clients.status');

        // Validate the request...
        $rules = [
			'users' => ["required", "list"],
			'status' => ["required", Rule::in ($statuses)],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
            // Retrieve the validated input...
            $validated = $validator->validated();
            $guids = $validated['users'];
            $record = User::whereIn('guid', $guids)->update(['status'=>$validated['status']]);
            if ($record) {
                return $this->sendResponse ('RECORDS_UPDATED');
            } else {
                return $this->sendError ('RECORDS_NOT_FOUND', 200);
            }
        }
    }


    // Retreive trashed records
    public function trashed (Request $request) {

        if (! auth()->user()->can('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $rules = [
			'search' => ['nullable', 'string'],
			'results_per_page' => ['nullable', 'numeric'],
			'page' => ['nullable', 'numeric'],
		];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();
            $filters = Config::get('clients.filters');

            $results_per_page 	= $filters['results_per_page'];
            $search 			= $filters['search'];
            $page 				= $filters['page'];
            $offset 			= $filters['offset'];

            $results_per_page = ( ! isset($validated['results_per_page'])) ? $results_per_page : $validated['results_per_page'];
            $search = ( ! isset($validated['search'])) ? $search : $validated['search'];
            $page = ( ! isset($validated['page'])) ? $page : $validated['page'];

            $total_results = Firm::select('guid')->onlyTrashed()->count();
            $max = ceil ($total_results / $results_per_page);
            for ($i=1; $i<=$max; $i++) {
                if ($i == $page) {
                    $offset = ($i-1) * $results_per_page;
                }
            }

            $records = Firm::select('*')
                         ->whereAny(['firm_name', 'contact_email', 'contact_mobile', 'city'], 'like', "%$search%")
                         ->onlyTrashed()
                         ->limit($results_per_page)
                         ->offset($offset)
                         ->get ();

            $num_results = count($records);
            $payload = [
                'meta' => [
                    'first_page' 			=> 1,
                    'last_page' 			=> $max,
                    'current_page'			=> intval($page),
                    'num_results'			=> $num_results,
                    'total_results'			=> $total_results,
                ],
                'data' => $records,
            ];
            // An empty result set is a valid, successful response — not an
            // error — so the frontend doesn't have to special-case it to
            // avoid showing a spurious "failed to fetch" notification.
            return $this->sendResponse ('RECORDS_FOUND', $payload);
        }
    }

    // Restore trashed records
    public function restore (Request $request) {
        if (! auth()->user()->can('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        // Validate the request...
        $rules = [
			'guid' => ["required", "list"]
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
            // Retrieve the validated input...
            $validated = $validator->validated();
            $record = Firm::onlyTrashed()->whereIn('guid', $validated['guid'])->restore ();
            if ($record) {
                return $this->sendResponse ('RECORDS_RESTORED');
            } else {
                return $this->sendError ('RECORDS_NOT_FOUND', 200);
            }
        }
    }

    // Trash/Soft delete
	public function trash (Request $request, string $guid='') {
        if (! auth()->user()->can('firms.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        // Validate the request...
        $rules = [
			'guid' => ["required", "list"]
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
            // Retrieve the validated input...
            $validated = $validator->validated();
            $record = Firm::whereIn('guid', $validated['guid'])->delete ();
            if ($record) {
                return $this->sendResponse ('RECORDS_TRASHED');
            } else {
                return $this->sendError ('RECORDS_NOT_FOUND', 200);
            }
        }
    }

    // Delete (permanentaly)
	public function delete (Request $request, string $guid='') {
        if (! auth()->user()->can('firms.delete')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        // Validate the request...
        $rules = [
			'guid' => ["required", "list"]
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
            // Retrieve the validated input...
            $validated = $validator->validated();
            $record = Firm::withTrashed()->whereIn('guid', $validated['guid'])->forceDelete ();
            if ($record) {
                return $this->sendResponse ('RECORDS_DELETED');
            } else {
                return $this->sendError ('RECORDS_NOT_FOUND', 200);
            }
        }
    }

    // get all business users 
    public function users (Request $request, string $guid='') {

        $firm = Firm::where ('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'access_business_account')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $users = $firm->users;
        $num_results = count($users);
        $payload = [
            'meta' => [
                'num_results'			=> $num_results,
                'total_results'			=> $num_results,
            ],
            'data' => $users,
        ];

        if ($num_results > 0) {
            return $this->sendResponse ('RECORDS_FOUND', $payload);
        } else {
            return $this->sendError ('RECORDS_NOT_FOUND', 200);
        }
    }

    // get all business documents 
    public function documents (Request $request, string $guid='') {
        $firm = Firm::where ('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'access_business_account')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $files = [];
        $checklist = $firm->checklist_items;
        if (! empty ($checklist)) {
            foreach ($checklist as $item) {
                if (! empty ($item->files)) {
                    foreach ($item->files as $file) {
                        $file->checklist_item_name = $item->name;
                        $file->checklist_item_code = $item->code;
                        $file->checklist_item_is_required = $item->is_required;
                        $files[] = $file;
                    }
                }
            }
        }   
        $num_results = count($files);
        $payload = [
            'meta' => [
                'num_results'			=> $num_results,
                'total_results'			=> $num_results,
            ],
            'data' => $files,
        ];

        if ($num_results > 0) {
            return $this->sendResponse ('RECORDS_FOUND', $payload);
        } else {
            return $this->sendResponse ('RECORDS_NOT_FOUND', $payload);
        }
    }

    public function settings (Request $request, string $guid='') {
        $firm = Firm::where ('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'access_business_account')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $settings = $firm->settings;
        return $this->sendResponse ('RECORDS_FOUND', $settings);
    } 

    public function getTaxReturnOccurrences(Request $request)
    {
        $rules = [
            'business_category' => ['required', 'string'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $isCorporation = strtolower(trim($validated['business_category'])) === 'corporation';

        $occurrences = $isCorporation
            ? ['Yearly', 'Monthly', 'Quarterly']
            : ['Yearly'];

        return $this->sendResponse('RECORDS_FOUND', [
            'business_category' => $validated['business_category'],
            'occurance_options' => $occurrences,
        ]);
    }

    public function getBusinessCount()
    {
        // Counts firms, not users, so it matches what list()/getAll() show —
        // draft firms (not yet assigned an Accountant/Admin) are excluded.
        $query = Firm::query()->where('status', 'active');

        // Admin sees the platform total; Accountant/Staff see only clients
        // on firms they're assigned to — same "my clients" scope as list().
        if (! auth()->user()->hasRole('Admin')) {
            $query->whereIn('id', $this->myAssignedFirmIds());
        }

        return $this->sendResponse('COUNT_FETCHED', [
            'total_business_count' => $query->count(),
        ]);
    }
}
