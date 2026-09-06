<?php

namespace App\Modules\Users\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Encryption\DecryptException;
use Validator;

use App\Helpers\Common;
use App\Models\User;
use App\Modules\Users\Models\Meta;
use App\Modules\Users\Models\Role;
use App\Modules\Users\Models\IndividualStatus;
use App\Mail\MailSMTP;
use App\Http\Controllers\BaseController;
use App\Modules\Clients\Models\Firm;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Notifications\Models\Notification;

class Users extends BaseController {

    /**
     * Tier-1 (system) roles a role may be swapped to via profile-page editing —
     * always within the same group. Firm-management roles never cross into
     * client-facing roles or vice versa; tier-2 org-scoped roles (Lead
     * Accountant, Data Loader, etc.) are a separate concept handled by the
     * organization member-assignment endpoints, not this list.
     */
    private const ROLE_GROUPS = [
        ['Admin', 'Accountant', 'Staff'],
        ['Client', 'Employee'],
    ];

    private function roleGroupFor(string $roleName): array
    {
        foreach (self::ROLE_GROUPS as $group) {
            if (in_array($roleName, $group, true)) {
                return $group;
            }
        }
        return [$roleName];
    }

    /**
     * True if $actor may act (delete/deactivate) on every user in $guids.
     * Three tiers, matching the pattern used elsewhere for firm-scoped
     * actions: Admin bypasses, Accountant/Staff need the given permission
     * AND every target's firm to be one they hold an active
     * access_business_account assignment on (not just the flat platform
     * permission — otherwise any Accountant could act on any firm's
     * users), Client/Employee (who hold neither) fall back to "every
     * target shares my own firm_id."
     */
    private function authorizeUsersInScope(array $guids, User $actor, string $permission): bool
    {
        if ($actor->hasRole('Admin')) {
            return true;
        }

        if ($actor->can($permission)) {
            $targetFirmIds = User::whereIn('guid', $guids)->pluck('firm_id')->filter()->unique();
            foreach ($targetFirmIds as $firmId) {
                if (! $this->authorizeFirmScope($firmId, 'firms.manage', 'access_business_account')) {
                    return false;
                }
            }
            // Any target with no firm_id at all (e.g. another Accountant/
            // Staff/Taxfiler account) isn't coverable by firm-scope — only
            // allow those when the actor holds the permission with no
            // firm-scoping expectation, i.e. skip this branch for them.
            $unscopedTargets = User::whereIn('guid', $guids)->whereNull('firm_id')->exists();
            return ! $unscopedTargets;
        }

        if ($actor->firm_id === null) {
            return false;
        }

        return ! User::whereIn('guid', $guids)
            ->where(function ($query) use ($actor) {
                $query->where('firm_id', '!=', $actor->firm_id)
                    ->orWhereNull('firm_id');
            })->exists();
    }

    public function getAll (Request $request, string $guid=NULL ) {

        $firm_id = NULL;
        if (isset ($guid)) {
            
            if($guid=='individual')
            { 
               
                $roles = Role::pluck('name')->filter(function ($value) {
                return $value == 'Taxfiler';
                })->all(); 
            }
            else{
            $firm = Firm::where('guid', $guid)->first();
            if (! $firm) {
                return $this->sendError ('BUSINESS_NOT_FOUND');
            }
            $firm_id = $firm->id;

            // Same org-permission-code gate authorizeUsersInScope() above
            // uses for acting on this firm's users — without it, any
            // Accountant/Staff holding the flat users.view permission could
            // list every firm's Client/Employee roster, not just firms
            // they're actually assigned to.
            if (! $this->authorizeFirmScope($firm_id, 'firms.manage', 'access_business_account')) {
                return $this->sendError('UNAUTHORIZED', 403);
            }

            // Get roles
            $roles = Role::pluck('name')->filter(function ($value) {
                return $value == 'Client' || $value == 'Employee';
            })->all();
            }
        } else {
            // Get roles
            $roles = Role::pluck('name')->filter(function ($value) {
                return ($value == 'Accountant' || $value == 'Staff');
            })->all();
        }


        $filters = Config::get('users.filters');
        $order_by = Config::get('users.order_by');
        //$roles = Config::get('users.roles');

        $rules = [
			'search' => ['nullable', 'string'],
			'results_per_page' => ['nullable', 'numeric'],
			'page' => ['nullable', 'numeric'],
			'order_by' => ['nullable', 'string', Rule::in($order_by)],
			'status' => ['nullable', 'array'],
			'roles' => ['nullable', 'array'],
			'roles.*' => [Rule::in($roles)],
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
            $order_by 			= $filters['order_by'];
            $offset 			= $filters['offset'];

            $results_per_page = ( ! isset($validated['results_per_page'])) ? $results_per_page : $validated['results_per_page'];
            $search = ( ! isset($validated['search'])) ? $search : $validated['search'];
            $page = ( ! isset($validated['page'])) ? $page : $validated['page'];
            $order_by = ( ! isset($validated['order_by'])) ? $order_by : $validated['order_by'];
            $status = ( isset($validated['status'])) ? $validated['status'] : ['active'];
            $roles = ( isset($validated['roles'])) ? $validated['roles'] : $roles;

            $sql = User::whereAny(['first_name', 'mobile', 'last_name', 'email'], 'like', "%$search%");
            if ($firm_id) {
                $sql = $sql->where('firm_id', $firm_id);
            }
            if (!empty($status)) {
                $sql = $sql->whereIn('status', $status);
            }
            /*$sql = $sql->with(['roles'=>function ($query) use ($roles) {
                $query->whereIn ('name', $roles);
            }]);*/
            if (!empty($roles)) {
    $sql = $sql->whereHas('roles', function ($query) use ($roles) {
        $query->whereIn('name', $roles);
    })->with(['roles' => function ($query) use ($roles) {
        $query->whereIn('name', $roles);
        }]);
    } else {
        $sql = $sql->with('roles');
    }
            // Pagination
            $total_results = $sql->count ();
            $max = ceil ($total_results / $results_per_page);
            for ($i=1; $i<=$max; $i++) {
                if ($i == $page) {
                    $offset = ($i-1) * $results_per_page;
                }
            }

            $records = $sql->limit($results_per_page)->offset($offset)->get();

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
	public function getOne (Request $request, string $guid='') {

        // Self-service (view your own profile) or a staff permission to view
        // other users' profiles — never both required.
        if ($guid !== auth()->user()->guid && ! auth()->user()->can('users.view')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $user = User::where ('guid', $guid)->with (['roles' => function ($query) {
                $query->with (['links' => function ($query) {
                    $query->whereNull ('parent_id');
                    $query->orderBy ('menu_order', 'ASC');
                    $query->with ('children');
                }]);
            },'business'])->first ();
        if ( ($user) ) {
            // meta is `encrypted:array` — a row encrypted under a
            // different/rotated APP_KEY throws DecryptException here and
            // would otherwise 500 the whole profile view for this user.
            try {
                $meta = $user->meta;
            } catch (DecryptException $e) {
                Log::warning('Undecryptable user meta', ['user_id' => $user->id, 'error' => $e->getMessage()]);
                $meta = null;
                $user->setRawAttributes(array_merge($user->getAttributes(), ['meta' => null]));
            }
            // Taxfiler sees/edits their own SIN unmasked — the masking is
            // only to keep the raw number out of view for staff/other roles
            // browsing a profile, not for the Taxfiler themself.
            if (isset ($meta['sin_number']) && ! $user->hasRole('Taxfiler')) {
                $meta['sin_number_masked'] = Str::mask($meta['sin_number'], '*', 0, -3);
                unset ($meta['sin_number']);
            }
            if ($meta !== null) {
                $user->meta = $meta;
            }
            $user->permissions = $user->getAllPermissions()->pluck('name');
            return $this->sendResponse ('RECORDS_FOUND', $user);
        } else {
            return $this->sendError ('RECORDS_NOT_FOUND', 200);
        }
    }


    /**
     * Update use account
     *
     */
    public function edit (Request $request, string $guid='')
    {
        $user = User::where('guid', $guid)->first();

        if ($user) {
            // Self-service (edit your own profile), a staff permission to
            // edit other users' profiles, or — for Client/Employee, who
            // hold neither — being the firm owner of the target user (e.g.
            // a Client editing their own firm's Client/Employee accounts).
            $actor = auth()->user();
            $isSelf = $guid === $actor->guid;
            $isFirmOwner = $actor->firm_id !== null && $user->firm_id !== null
                && (int) $actor->firm_id === (int) $user->firm_id;

            if (! $isSelf && ! $actor->can('users.edit') && ! $isFirmOwner) {
                return $this->sendError('UNAUTHORIZED', 403);
            }

            // Email and role are Admin-editing-someone-else only — never
            // self-service, even for Admin's own profile.
            $canEditRestricted = ! $isSelf && $actor->hasRole('Admin');

            $rules = [
                'first_name' => ['nullable', 'string', 'max:255'],
                'last_name' => ['nullable', 'string', 'max:255'],
                'email' => ['nullable', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
                'role' => ['nullable', 'string', Rule::in($this->roleGroupFor($user->roles->first()?->name ?? ''))],
                'mobile' => ['nullable', 'numeric'],
                'alternate_email' => ['nullable', 'string', 'lowercase', 'email', 'max:255'],
                'alternate_mobile' => ['nullable', 'numeric'],
                'time_zone' => ['nullable', 'string',],
                'country' => ['nullable', 'string',],
                'country_code' => ['nullable', 'string',],
                'sin_number' => ['nullable', 'numeric'],
                'address' => ['nullable', 'string', 'max:255'],
                'dob' => ['nullable', 'date', 'date_format:Y-m-d',],
                'marital' => ['nullable', 'array',],
                'marital.status' => ['nullable', 'in:married,unmarried,divorced,widowed',],
                'marital.anniversary' => ['nullable', 'date', 'date_format:Y-m-d',],
                'marital.spouse_name' => ['nullable', 'string', 'max:255',],
                'marital.spouse_dob' => ['nullable', 'date', 'date_format:Y-m-d',],
                'marital.spouse_sin_number' => ['nullable', 'numeric',],
                'marital.spouse_status' => ['nullable', 'in:live-in,married',],
                'bank_details.*' => ['nullable', 'array',],
                'bank_details.*.account_holder_name' => ['nullable', 'string', 'max:255'],
                'bank_details.*.account_number' => ['nullable', 'string', 'max:50'],
                'bank_details.*.bank_name' => ['nullable', 'string', 'max:255'],
                'bank_details.*.bank_code' => ['nullable', 'string', 'max:50'],
                'institution_number' => ['nullable', 'string', 'max:50'],
                'transit_number' => ['nullable', 'string', 'max:50'],
            ];

            $validator = Validator::make($request->all(), $rules);
            if ($validator->fails()) {
                return $this->sendError ($validator->errors());
            } else {

                // Retrieve the validated input...
                $validated = $validator->validated();

                $data = [
                    'first_name' => isset($validated['first_name']) ? $validated['first_name'] : $user->first_name,
                    'last_name' => isset($validated['last_name']) ? $validated['last_name'] : $user->last_name,
                    'mobile' => isset($validated['mobile']) ? $validated['mobile'] : $user->mobile,
                ];

                // email/role: Admin-editing-someone-else only (never self-service) —
                // silently ignored otherwise, even if a value was somehow submitted.
                if ($canEditRestricted && isset($validated['email'])) {
                    $data['email'] = $validated['email'];
                }

                // meta is `encrypted:array` — a row encrypted under a
                // different/rotated APP_KEY throws DecryptException here and
                // would otherwise 500 the whole edit request. Same guard as
                // getOne().
                try {
                    $existingMeta = $user->meta ?? [];
                } catch (DecryptException $e) {
                    Log::warning('Undecryptable user meta', ['user_id' => $user->id, 'error' => $e->getMessage()]);
                    $existingMeta = [];
                }

                $meta =[
                    'alternate_mobile' => isset($validated['alternate_mobile']) ? $validated['alternate_mobile'] : (isset ($existingMeta['alternate_mobile']) ? $existingMeta['alternate_mobile'] : NULL),
                    'alternate_email' => isset($validated['alternate_email']) ? $validated['alternate_email'] : (isset ($existingMeta['alternate_email']) ? $existingMeta['alternate_email'] : NULL),
                    'country' => isset($validated['country']) ? $validated['country'] : (isset ($existingMeta['country']) ? $existingMeta['country'] : NULL),
                    'country_code' => isset($validated['country_code']) ? $validated['country_code'] : (isset ($existingMeta['country_code']) ? $existingMeta['country_code'] : NULL),
                    'time_zone' => isset($validated['time_zone']) ? $validated['time_zone'] : (isset ($existingMeta['time_zone']) ? $existingMeta['time_zone'] : NULL),
                    'sin_number' => isset($validated['sin_number']) ? $validated['sin_number'] : (isset ($existingMeta['sin_number']) ? $existingMeta['sin_number'] : NULL),
                    'dob' => isset($validated['dob']) ? $validated['dob'] : (isset ($existingMeta['dob']) ? $existingMeta['dob'] : NULL),
                    'marital' => isset($validated['marital']) ? $validated['marital'] : (isset ($existingMeta['marital']) ? $existingMeta['marital'] : NULL),
                    'address' => isset($validated['address']) ? $validated['address'] : (isset ($existingMeta['address']) ? $existingMeta['address'] : NULL),
                    'bank_details' => isset($validated['bank_details']) ? $validated['bank_details'] : (isset ($existingMeta['bank_details']) ? $existingMeta['bank_details'] : NULL),
                    'institution_number' => isset($validated['institution_number']) ? $validated['institution_number'] : (isset ($existingMeta['institution_number']) ? $existingMeta['institution_number'] : NULL),
                    'transit_number' => isset($validated['transit_number']) ? $validated['transit_number'] : (isset ($existingMeta['transit_number']) ? $existingMeta['transit_number'] : NULL),
                ];

                $data['meta'] = $meta;

                // Must go through the model instance (fill()->save()), not
                // a query-builder mass update (User::where(...)->update()) —
                // the latter bypasses Eloquent's attribute casting, so the
                // encrypted:array `meta` cast never runs and the plain PHP
                // array gets written straight to the DB unencrypted. That
                // corrupts the column and every later read of `meta` for
                // this user (here and elsewhere, e.g. getOne()) then throws
                // DecryptException trying to decrypt data that was never
                // actually encrypted.
                $user->update($data);

                // Role swap: Admin editing someone else, within the same tier-1 group
                // only (validated above via the `role` rule's Rule::in()). Tier-2
                // org-scoped roles (Lead Accountant, Data Loader, etc.) are a separate
                // concept managed by the organization member-assignment endpoints.
                if ($canEditRestricted && isset($validated['role'])) {
                    $currentRoleName = $user->roles->first()?->name;
                    if ($validated['role'] !== $currentRoleName) {
                        $user->syncRoles([$validated['role']]);
                    }
                }

                $user = $user->fresh ();

                ActivityLog::recordRoleAction('update', auth()->user(), 'updates profile');

                Notification::record(
                    $user->id,
                    'Profile updated',
                    'Your profile details have been updated.',
                    'profile_updated',
                    auth()->id()
                );

                return $this->sendResponse ('RECORD_UPDATED', $user);
            }
        } else {
            return $this->sendError ('USER_NOT_FOUND');
        }
    }

    // Change status
	public function status (Request $request) {

	    $config = Config::get ('users');
	    $statuses = $config['status'];

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
            $actor = auth()->user();

            if (! $this->authorizeUsersInScope($guids, $actor, 'users.manage-status')) {
                return $this->sendError('UNAUTHORIZED', 403);
            }

            $record = User::whereIn('guid', $guids)->update(['status'=>$validated['status']]);
            if ($record) {
                return $this->sendResponse ('RECORDS_UPDATED');
            } else {
                return $this->sendError ('NO_RECORDS_UPDATED');
            }
        }
    }


    // Delete (permanentaly)
	public function delete (Request $request) {

        // Validate the request...
        $rules = [
			'users' => ["required", "list"],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
            // Retrieve the validated input...
            $validated = $validator->validated();
            $guids = $validated['users'];
            $actor = auth()->user();
            $guid = $actor->guid;

            // Check if the user is trying to delete their own record
            if (in_array($guid, $guids) && count ($guids) == 1) {
                return $this->sendError('CANNOT_DELETE_SELF_RECORD');
            }

            if (! $this->authorizeUsersInScope($guids, $actor, 'users.delete')) {
                return $this->sendError('UNAUTHORIZED', 403);
            }

            // Delete the users
            $record = User::whereIn('guid', $guids)
                        ->whereNot(function ($query) use ($guid) {
                            $query->where('guid', $guid);
                        })->forceDelete();

            if ($record) {
                return $this->sendResponse('RECORDS_DELETED');
            } else {
                return $this->sendError ('NO_RECORDS_DELETED');
            }
        }
    }

    public function getTaxfilerCount()
    {
        $count = User::whereHas('roles', function ($query) {
            $query->where('name', 'Taxfiler');
        })->count();

        return $this->sendResponse('COUNT_FETCHED', [
            'total_taxfiler_individuals' => $count
        ]);
    }

    public function getStaffCount()
    {
        $query = User::whereHas('roles', function ($query) {
            $query->where('name', 'Staff');
        });

        // Admin sees every Staff account; Accountant/Staff instead see how
        // many Staff are also assigned to any firm in their own "my
        // clients" scope, rather than the platform-wide total.
        if (! auth()->user()->hasRole('Admin')) {
            $firmIds = $this->myAssignedFirmIds();
            $query->whereHas('organizationAssignments', function ($assignmentQuery) use ($firmIds) {
                $assignmentQuery->whereIn('firm_id', $firmIds);
            });
        }

        return $this->sendResponse('COUNT_FETCHED', [
            'total_staff' => $query->count()
        ]);
    }

    public function listAll(Request $request)
    {
        $filters  = Config::get('users.filters');
        $order_by = Config::get('users.order_by');

        $rules = [
            'search'           => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
            'order_by'         => ['nullable', 'string', Rule::in($order_by)],
            'status'           => ['nullable', 'array'],
            'roles'            => ['nullable', 'array'],
            'roles.*'          => ['string'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated        = $validator->validated();
        $results_per_page = $validated['results_per_page'] ?? $filters['results_per_page'];
        $search           = $validated['search']           ?? $filters['search'];
        $page             = $validated['page']             ?? $filters['page'];
        $order_by         = $validated['order_by']         ?? $filters['order_by'];
        $status           = $validated['status']           ?? ['active'];
        $roles            = $validated['roles']            ?? [];

        $sql = User::whereAny(['first_name', 'mobile', 'last_name', 'email'], 'like', "%$search%");

        if (!empty($status)) {
            $sql = $sql->whereIn('status', $status);
        }

        if (!empty($roles)) {
            $sql = $sql->whereHas('roles', function ($query) use ($roles) {
                $query->whereIn('name', $roles);
            })->with(['roles' => function ($query) use ($roles) {
                $query->whereIn('name', $roles);
            }]);
        } else {
            $sql = $sql->with('roles');
        }

        $total_results = $sql->count();
        $max    = $total_results > 0 ? ceil($total_results / $results_per_page) : 1;
        $offset = (max(1, $page) - 1) * $results_per_page;

        $records     = $sql->limit($results_per_page)->offset($offset)->get();
        $num_results = count($records);

        $payload = [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $max,
                'current_page'  => intval($page),
                'num_results'   => $num_results,
                'total_results' => $total_results,
            ],
            'data' => $records,
        ];

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to
        // avoid showing a spurious "failed to fetch" notification.
        return $this->sendResponse('RECORDS_FOUND', $payload);
    }

    public function getStaffWithStatus(Request $request)
    {
        $filters  = Config::get('users.filters');
        $order_by = Config::get('users.order_by');

        $rules = [
            'search'           => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
            'order_by'         => ['nullable', 'string', Rule::in($order_by)],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated        = $validator->validated();
        $results_per_page = $validated['results_per_page'] ?? $filters['results_per_page'];
        $search           = $validated['search']           ?? $filters['search'];
        $page             = $validated['page']             ?? $filters['page'];
        $order_by         = $validated['order_by']         ?? $filters['order_by'];

        $sql = User::whereHas('roles', fn ($q) => $q->where('name', 'Staff'))
                   ->whereAny(['first_name', 'last_name', 'email', 'mobile'], 'like', "%$search%")
                   ->with(['roles', 'individualStatus']);

        $total_results = $sql->count();
        $max    = $total_results > 0 ? ceil($total_results / $results_per_page) : 1;
        $offset = (max(1, $page) - 1) * $results_per_page;

        $records = $sql->orderBy($order_by)->limit($results_per_page)->offset($offset)->get()
                       ->map(fn ($user) => array_merge($user->toArray(), [
                           'individual_status' => $user->individualStatus->individual_status,
                       ]));

        $num_results = count($records);

        $payload = [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $max,
                'current_page'  => intval($page),
                'num_results'   => $num_results,
                'total_results' => $total_results,
            ],
            'data' => $records,
        ];

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to
        // avoid showing a spurious "failed to fetch" notification.
        return $this->sendResponse('RECORDS_FOUND', $payload);
    }

    public function toggleIndividualStatus(Request $request)
    {
        $rules = [
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $userId = $validator->validated()['user_id'];

        $record = IndividualStatus::where('user_id', $userId)->first();

        if ($record) {
            $newStatus = $record->individual_status === 'enabled' ? 'disabled' : 'enabled';
            $record->update(['individual_status' => $newStatus]);
        } else {
            $record = IndividualStatus::create([
                'user_id'           => $userId,
                'individual_status' => 'enabled',
            ]);
            $newStatus = 'enabled';
        }

        return $this->sendResponse('STATUS_UPDATED', [
            'user_id'           => $userId,
            'individual_status' => $newStatus,
        ]);
    }

    public function getRecent(Request $request)
    {
        $query = User::orderBy('created_at', 'desc');

        // Admin sees the platform-wide recent signups; Accountant/Staff
        // instead see only business users on firms they're assigned to, or
        // taxfilers individually assigned to them — same "my clients" scope
        // as getBusinessCount()/getStaffCount().
        if (! auth()->user()->hasRole('Admin')) {
            $firmIds = $this->myAssignedFirmIds();
            $query->where(function ($scope) use ($firmIds) {
                $scope->whereIn('firm_id', $firmIds)
                    ->orWhereHas('individualAssignments', function ($assignmentQuery) {
                        $assignmentQuery->where('user_id', auth()->id());
                    });
            });
        }

        $users = $query->limit(4)
            ->get(['id', 'first_name', 'last_name', 'email', 'firm_id', 'created_at']);

        if ($users->isEmpty()) {
            return $this->sendError('NO_RECORDS_FOUND', 200);
        }

        $data = $users->map(fn ($user) => [
            'name'       => trim($user->first_name . ' ' . $user->last_name),
            'email'      => $user->email,
            'type'       => is_null($user->firm_id) ? 'individual' : 'business',
            'time_ago'   => $user->created_at->diffForHumans(),
        ]);

        return $this->sendResponse('RECORDS_FOUND', $data);
    }

}
