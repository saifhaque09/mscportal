<?php

namespace App\Modules\Organizations\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;
use Validator;
use App\Http\Controllers\BaseController;
use App\Helpers\Guid;
use App\Models\User;
use App\Modules\Clients\Models\Firm;
use App\Modules\Organizations\Models\OrganizationPermission;
use App\Modules\Organizations\Models\OrganizationRole;
use App\Modules\Organizations\Models\OrganizationUserAssignment;
use App\Modules\Organizations\Models\IndividualUserAssignment;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Notifications\Models\Notification;

class Firms extends BaseController {

    public function getAll(Request $request)
    {
        $filters = Config::get('organizations.filters');

        $rules = [
            'search'           => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated        = $validator->validated();
        $results_per_page = isset($validated['results_per_page']) ? $validated['results_per_page'] : $filters['results_per_page'];
        $search           = isset($validated['search'])           ? $validated['search']           : $filters['search'];
        $page             = isset($validated['page'])             ? $validated['page']             : $filters['page'];

        $searchColumns = ['guid', 'firm_name', 'contact_email', 'contact_mobile', 'city'];

        $paginated = Firm::whereAny($searchColumns, 'like', "%$search%")
            ->paginate((int) $results_per_page, ['*'], 'page', (int) $page);

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to avoid
        // showing a spurious "failed to fetch" notification.
        $firms = collect($paginated->items());

        $assignments = OrganizationUserAssignment::whereIn('firm_id', $firms->pluck('id'))
            ->with([
                'user:id,guid,first_name,last_name,email,mobile,status',
                'organizationRole:id,code,name',
            ])
            ->get()
            ->groupBy('firm_id');

        $builtInRoleCodes = ['lead_acc', 'senior', 'junior', 'dataloader'];

        $records = $firms->map(function ($firm) use ($assignments, $builtInRoleCodes) {
            $byRole = $assignments->get($firm->id, collect())->groupBy('organizationRole.code');

            $customRoles = $byRole
                ->filter(fn ($group, $code) => $code !== '' && ! in_array($code, $builtInRoleCodes, true))
                ->map(function ($group) {
                    $role = $group->first()->organizationRole;
                    return [
                        'role_id' => $role->id,
                        'code'    => $role->code,
                        'name'    => $role->name,
                        'users'   => $this->mapUsers($group),
                    ];
                })
                ->values()
                ->all();

            return [
                'id'        => $firm->id,
                'guid'      => $firm->guid,
                'firm_name' => $firm->firm_name,
                'assignments' => [
                    'lead_accountant' => $this->mapUsers($byRole->get('lead_acc')),
                    'senior'          => $this->mapUsers($byRole->get('senior')),
                    'junior'          => $this->mapUsers($byRole->get('junior')),
                    'dataloader'      => $this->mapUsers($byRole->get('dataloader')),
                    'custom_roles'    => $customRoles,
                ],
            ];
        });

        $payload = [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $paginated->lastPage(),
                'current_page'  => $paginated->currentPage(),
                'num_results'   => $paginated->count(),
                'total_results' => $paginated->total(),
            ],
            'data' => $records,
        ];

        return $this->sendResponse('RECORDS_FOUND', $payload);
    }

    /**
     * List the organizations the logged-in user belongs to, with their
     * organization_role and that role's permissions in each.
     *
     * Accountant/staff users are matched via organization_user_assignments
     * and can span multiple firms. Client users have no organization_role
     * assignment at all — they're tied to a single firm via users.firm_id —
     * so they get that firm back with a null role and empty permissions.
     */
    public function getMyPermissions(Request $request)
    {
        $user = auth()->user();

        $assignments = OrganizationUserAssignment::where('user_id', $user->id)
            ->with([
                'firm:id,guid,firm_name',
                'organizationRole:id,code,name',
                'organizationRole.permissions:id,code,name,status',
            ])
            ->get();

        if ($assignments->isNotEmpty()) {
            $organizations = $assignments->map(fn ($assignment) => [
                'firm_id'     => $assignment->firm->id,
                'guid'        => $assignment->firm->guid,
                'firm_name'   => $assignment->firm->firm_name,
                'role'        => [
                    'id'   => $assignment->organizationRole->id,
                    'code' => $assignment->organizationRole->code,
                    'name' => $assignment->organizationRole->name,
                ],
                'permissions' => $assignment->organizationRole->permissions->map(fn ($p) => [
                    'id'     => $p->id,
                    'code'   => $p->code,
                    'name'   => $p->name,
                    'status' => $p->status,
                ])->values()->all(),
            ])->values()->all();

            return $this->sendResponse('RECORDS_FOUND', ['organizations' => $organizations]);
        }

        if ($user->firm_id) {
            $firm = Firm::find($user->firm_id, ['id', 'guid', 'firm_name']);

            if ($firm) {
                return $this->sendResponse('RECORDS_FOUND', [
                    'organizations' => [[
                        'firm_id'     => $firm->id,
                        'guid'        => $firm->guid,
                        'firm_name'   => $firm->firm_name,
                        'role'        => null,
                        'permissions' => [],
                    ]],
                ]);
            }
        }

        // No organization assignment and no fallback firm — genuinely
        // nothing to report, but still a successful (empty) response.
        return $this->sendResponse('RECORDS_FOUND', ['organizations' => []]);
    }

    /**
     * Admin lookup: list every organization (firm) and taxfiler client a
     * specific person is assigned to, with the organization_role and that
     * role's permissions in each. Same shape/logic as getMyPermissions()
     * but for an arbitrary user — gated behind organizations.manage via the
     * route middleware rather than being self-scoped.
     */
    public function getUserPermissions(Request $request, string $guid = '')
    {
        $user = User::where('guid', $guid)->with('roles:id,name')->first();
        if (! $user) {
            return $this->sendError('RECORDS_NOT_FOUND', 200);
        }

        $firmAssignments = OrganizationUserAssignment::where('user_id', $user->id)
            ->with([
                'firm:id,guid,firm_name',
                'organizationRole:id,code,name',
                'organizationRole.permissions:id,code,name,status',
            ])
            ->get();

        $organizations = $firmAssignments->map(fn ($assignment) => [
            'firm_id'     => $assignment->firm->id,
            'guid'        => $assignment->firm->guid,
            'firm_name'   => $assignment->firm->firm_name,
            'role'        => $this->formatOrganizationRole($assignment->organizationRole),
            'permissions' => $this->formatOrganizationPermissions($assignment->organizationRole),
        ])->values()->all();

        if (empty($organizations) && $user->firm_id) {
            $firm = Firm::find($user->firm_id, ['id', 'guid', 'firm_name']);
            if ($firm) {
                $organizations = [[
                    'firm_id'     => $firm->id,
                    'guid'        => $firm->guid,
                    'firm_name'   => $firm->firm_name,
                    'role'        => null,
                    'permissions' => [],
                ]];
            }
        }

        $individualAssignments = IndividualUserAssignment::where('user_id', $user->id)
            ->with([
                'taxfiler:id,guid,first_name,last_name',
                'organizationRole:id,code,name',
                'organizationRole.permissions:id,code,name,status',
            ])
            ->get();

        $individuals = $individualAssignments->map(fn ($assignment) => [
            'taxfiler_id' => $assignment->taxfiler->id,
            'guid'        => $assignment->taxfiler->guid,
            'name'        => trim($assignment->taxfiler->first_name.' '.$assignment->taxfiler->last_name),
            'role'        => $this->formatOrganizationRole($assignment->organizationRole),
            'permissions' => $this->formatOrganizationPermissions($assignment->organizationRole),
        ])->values()->all();

        return $this->sendResponse('RECORDS_FOUND', [
            'roles'         => $user->roles->pluck('name')->values()->all(),
            'permissions'   => $user->getAllPermissions()->pluck('name')->values()->all(),
            'organizations' => $organizations,
            'individuals'   => $individuals,
        ]);
    }

    private function formatOrganizationRole(OrganizationRole $role): array
    {
        return ['id' => $role->id, 'code' => $role->code, 'name' => $role->name];
    }

    private function formatOrganizationPermissions(OrganizationRole $role): array
    {
        return $role->permissions->map(fn ($p) => [
            'id'     => $p->id,
            'code'   => $p->code,
            'name'   => $p->name,
            'status' => $p->status,
        ])->values()->all();
    }

    public function assignRole(Request $request, string $guid = '')
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        $rules = [
            'user_id'              => ['required', 'integer', 'exists:users,id'],
            'organization_role_id' => ['required', 'integer', 'exists:organization_roles,id'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $role = OrganizationRole::where('id', $validated['organization_role_id'])
            ->where('status', 'active')
            ->first();
        if (! $role) {
            return $this->sendError('ROLE_NOT_FOUND_OR_INACTIVE');
        }

        // A user can hold several different org roles on the same firm
        // (e.g. Senior on one engagement doesn't preclude also being
        // Dataloader on it) — only the exact same role twice is meaningless,
        // and that's already prevented below by ROLE_ALREADY_OCCUPIED_IN_FIRM
        // plus the org_user_role_unique DB constraint.

        $roleOccupied = OrganizationUserAssignment::where([
            'firm_id'              => $firm->id,
            'organization_role_id' => $validated['organization_role_id'],
        ])->exists();

        if ($roleOccupied) {
            return $this->sendError('ROLE_ALREADY_OCCUPIED_IN_FIRM');
        }

        $assignment = OrganizationUserAssignment::create([
            'firm_id'              => $firm->id,
            'user_id'              => $validated['user_id'],
            'organization_role_id' => $validated['organization_role_id'],
        ]);

        // First assignment on a draft firm activates it — whether the
        // assignee is a real Accountant or Admin assigning themselves.
        if ($firm->status === 'draft') {
            $firm->update(['status' => 'active']);
        }

        $assignment->load([
            'user:id,guid,first_name,last_name,email,mobile',
            'organizationRole:id,code,name',
        ]);

        ActivityLog::record('role', 'Assign role', null, auth()->id());

        $this->notifyRoleAssigned($assignment, $firm);

        return $this->sendResponse('ROLE_ASSIGNED', $assignment);
    }

    /**
     * Notify the user that they were just assigned an organisation role for a firm.
     */
    private function notifyRoleAssigned(OrganizationUserAssignment $assignment, Firm $firm): void
    {
        Notification::record(
            $assignment->user_id,
            'Organisation role assigned',
            "You have been assigned the role \"{$assignment->organizationRole->name}\" for {$firm->firm_name}.",
            'organisation_role_assigned',
            auth()->id()
        );
    }

    public function getMembers(Request $request, string $guid = '')
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }
        // Admin/Accountant/Staff (organizations.manage) always allowed;
        // Client/Employee fall to firm_id ownership, so they can see who's
        // assigned to their own firm without holding that permission.
        if (! $this->authorizeFirmScope($firm->id, 'organizations.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $filters = Config::get('organizations.filters');

        $rules = [
            'search'           => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated        = $validator->validated();
        $results_per_page = isset($validated['results_per_page']) ? $validated['results_per_page'] : $filters['results_per_page'];
        $search           = isset($validated['search'])           ? $validated['search']           : $filters['search'];
        $page             = isset($validated['page'])             ? $validated['page']             : $filters['page'];

        $paginated = OrganizationUserAssignment::where('firm_id', $firm->id)
            ->with([
                'user:id,guid,first_name,last_name,email,mobile,status',
                'organizationRole:id,code,name',
            ])
            ->where(function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->whereAny(['first_name', 'last_name', 'email', 'mobile'], 'like', "%$search%");
                })
                ->orWhereHas('organizationRole', function ($rq) use ($search) {
                    $rq->whereAny(['name', 'code'], 'like', "%$search%");
                });
            })
            ->paginate((int) $results_per_page, ['*'], 'page', (int) $page);

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to avoid
        // showing a spurious "failed to fetch" notification.
        $allRoles  = OrganizationRole::where('status', 'active')->orderBy('id')->get();
        $byRoleId  = collect($paginated->items())->groupBy('organization_role_id');

        $roleGroups = [];
        foreach ($allRoles as $role) {
            $roleGroups[$role->code] = $this->mapUsers($byRoleId->get($role->id));
        }

        $payload = array_merge([
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $paginated->lastPage(),
                'current_page'  => $paginated->currentPage(),
                'num_results'   => $paginated->count(),
                'total_results' => $paginated->total(),
            ],
            'firm_id'   => $firm->id,
            'guid'      => $firm->guid,
            'firm_name' => $firm->firm_name,
        ], $roleGroups);

        return $this->sendResponse('MEMBERS_FOUND', $payload);
    }

    public function getLeadAccountants(Request $request, string $guid = '')
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        $assignments = OrganizationUserAssignment::where('firm_id', $firm->id)
            ->whereHas('organizationRole', fn ($q) => $q->where('code', 'lead_acc'))
            ->with([
                'user:id,guid,first_name,last_name,email,mobile,status',
                'organizationRole:id,code,name',
            ])
            ->get();

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to avoid
        // showing a spurious "failed to fetch" notification.
        $payload = [
            'firm_id'           => $firm->id,
            'guid'              => $firm->guid,
            'firm_name'         => $firm->firm_name,
            'lead_accountants'  => $this->mapUsers($assignments),
        ];

        return $this->sendResponse('RECORDS_FOUND', $payload);
    }

    public function editRole(Request $request, int $id = 0)
    {
        $protected = ['lead_acc', 'senior', 'dataloader'];

        $role = OrganizationRole::find($id);
        if (! $role) {
            return $this->sendError('ROLE_NOT_FOUND', 200);
        }

        if (in_array($role->code, $protected)) {
            return $this->sendError('ROLE_CANNOT_BE_EDITED');
        }

        $rules = [
            'name'          => ['nullable', 'string', 'max:255', 'unique:organization_roles,name,' . $id],
            'permissions'   => ['nullable', 'array'],
            'permissions.*' => ['integer', 'exists:organization_permissions,id'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        if (array_key_exists('permissions', $validated) && $this->permissionSetInUse($validated['permissions'] ?? [], $role->id)) {
            return $this->sendError('PERMISSION_SET_ALREADY_IN_USE');
        }

        if (isset($validated['name'])) {
            $role->name = $validated['name'];
            $role->save();
        }

        if (array_key_exists('permissions', $validated)) {
            $role->permissions()->sync($validated['permissions'] ?? []);
            $this->notifyRolePermissionsUpdated($role);
        }

        $role->load('permissions:id,code,name,status');

        ActivityLog::record('roles', 'editing roles', null, auth()->id());

        return $this->sendResponse('ROLE_UPDATED', [
            'id'          => $role->id,
            'code'        => $role->code,
            'name'        => $role->name,
            'status'      => $role->status,
            'permissions' => $role->permissions->map(fn ($p) => [
                'id'     => $p->id,
                'code'   => $p->code,
                'name'   => $p->name,
                'status' => $p->status,
            ])->values()->all(),
        ]);
    }

    public function deleteRole(Request $request, int $id = 0)
    {
        $protected = ['lead_acc', 'senior', 'junior', 'dataloader'];

        $role = OrganizationRole::find($id);
        if (! $role) {
            return $this->sendError('ROLE_NOT_FOUND', 200);
        }

        if (in_array($role->code, $protected)) {
            return $this->sendError('ROLE_CANNOT_BE_DELETED');
        }

        $roleName = $role->name;

        $role->delete();

        ActivityLog::record('roles', 'delete role', null, auth()->id());

        $this->notifyOrganisationRoleDeleted($roleName);

        return $this->sendResponse('ROLE_DELETED', []);
    }

    /**
     * True if some other role already has the exact same set of permissions
     * (order-independent). $excludeRoleId lets an edit compare against every
     * role except itself.
     */
    private function permissionSetInUse(array $permissionIds, ?int $excludeRoleId = null): bool
    {
        $permissionIds = collect($permissionIds)->map(fn ($id) => (int) $id)->unique()->sort()->values()->all();

        if (empty($permissionIds)) {
            return false;
        }

        $query = OrganizationRole::query()->with('permissions:id');
        if ($excludeRoleId) {
            $query->where('id', '!=', $excludeRoleId);
        }

        foreach ($query->get() as $existingRole) {
            $existingPermissionIds = $existingRole->permissions->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all();
            if ($existingPermissionIds === $permissionIds) {
                return true;
            }
        }

        return false;
    }

    public function createRole(Request $request)
    {
        $rules = [
            'name'          => ['required', 'string', 'max:255', 'unique:organization_roles,name'],
            'status'        => ['nullable', 'string', 'in:active,inactive'],
            'permissions'   => ['required', 'array', 'min:1'],
            'permissions.*' => ['integer', 'exists:organization_permissions,id'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors(), 422);
        }

        $validated = $validator->validated();

        if ($this->permissionSetInUse($validated['permissions'])) {
            return $this->sendError('PERMISSION_SET_ALREADY_IN_USE');
        }

        // code is not accepted from the client — it's a dynamically
        // generated identifier (usable in URLs) rather than a user-chosen
        // value, so it's placeholder-filled here (satisfies the NOT
        // NULL/unique columns) and immediately replaced with a real
        // unique code below, same as firms.guid.
        $role = OrganizationRole::create([
            'name'   => $validated['name'],
            'code'   => Str::random(10),
            'status' => $validated['status'] ?? 'active',
        ]);

        Guid::generate('organization_roles', 'code', $validated['name'], $role->id);
        $role->refresh();

        $role->permissions()->sync($validated['permissions']);

        $role->load('permissions:id,code,name,status');

        ActivityLog::record('role', 'Adding new organisation role', null, auth()->id());

        $this->notifyOrganisationRoleCreated($role);

        return $this->sendResponse('ROLE_CREATED', [
            'id'          => $role->id,
            'code'        => $role->code,
            'name'        => $role->name,
            'status'      => $role->status,
            'permissions' => $role->permissions->map(fn ($p) => [
                'id'     => $p->id,
                'code'   => $p->code,
                'name'   => $p->name,
                'status' => $p->status,
            ])->values()->all(),
        ]);
    }

    /**
     * Notify every global Admin that a new organisation role was added to the catalog.
     * organization_roles isn't firm-scoped, so there's no firm-based recipient list here.
     */
    private function notifyOrganisationRoleCreated(OrganizationRole $role): void
    {
        $recipients = User::role('Admin')->get();

        foreach ($recipients as $recipient) {
            Notification::record(
                $recipient->id,
                'New organisation role added',
                "A new organisation role \"{$role->name}\" was created.",
                'organisation_role_created',
                auth()->id()
            );
        }
    }

    /**
     * Notify every global Admin that an existing organisation role's permission
     * set was changed. Fires only when editRole() actually receives a
     * `permissions` key — not on a plain name-only edit.
     */
    private function notifyRolePermissionsUpdated(OrganizationRole $role): void
    {
        $recipients = User::role('Admin')->get();

        foreach ($recipients as $recipient) {
            Notification::record(
                $recipient->id,
                'Role permissions updated',
                "Permissions for the organisation role \"{$role->name}\" have been updated.",
                'role_permissions_updated',
                auth()->id()
            );
        }
    }

    /**
     * Notify every global Admin that an organisation role was deleted.
     * $roleName is captured before the delete() call since organization_roles
     * has no SoftDeletes — the row is actually gone by the time this fires.
     */
    private function notifyOrganisationRoleDeleted(string $roleName): void
    {
        $recipients = User::role('Admin')->get();

        foreach ($recipients as $recipient) {
            Notification::record(
                $recipient->id,
                'Organisation role deleted',
                "The organisation role \"{$roleName}\" has been deleted.",
                'organisation_role_deleted',
                auth()->id()
            );
        }
    }

    public function getRoles(Request $request)
    {
        $filters = Config::get('organizations.filters');

        $rules = [
            'search'           => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated        = $validator->validated();
        $results_per_page = $validated['results_per_page'] ?? $filters['results_per_page'];
        $search           = $validated['search']           ?? $filters['search'];
        $page             = $validated['page']             ?? $filters['page'];

        $paginated = OrganizationRole::with('permissions:id,code,name,status')
            ->where(function ($q) use ($search) {
                $q->whereAny(['name', 'code'], 'like', "%$search%");
            })
            ->paginate((int) $results_per_page, ['*'], 'page', (int) $page);

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to avoid
        // showing a spurious "failed to fetch" notification.
        $records = collect($paginated->items())->map(fn ($role) => [
            'id'          => $role->id,
            'code'        => $role->code,
            'name'        => $role->name,
            'status'      => $role->status,
            'permissions' => $role->permissions->map(fn ($p) => [
                'id'     => $p->id,
                'code'   => $p->code,
                'name'   => $p->name,
                'status' => $p->status,
            ])->values()->all(),
        ]);

        $payload = [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $paginated->lastPage(),
                'current_page'  => $paginated->currentPage(),
                'num_results'   => $paginated->count(),
                'total_results' => $paginated->total(),
            ],
            'data' => $records,
        ];

        return $this->sendResponse('RECORDS_FOUND', $payload);
    }

    public function getPermissions(Request $request)
    {
        $permissions = OrganizationPermission::where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'status']);

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to avoid
        // showing a spurious "failed to fetch" notification.
        return $this->sendResponse('RECORDS_FOUND', $permissions);
    }

    public function removeRole(Request $request, string $guid = '')
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        $rules = [
            'user_id'              => ['required', 'integer', 'exists:users,id'],
            'organization_role_id' => ['required', 'integer', 'exists:organization_roles,id'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $assignment = OrganizationUserAssignment::where([
            'firm_id'              => $firm->id,
            'user_id'              => $validated['user_id'],
            'organization_role_id' => $validated['organization_role_id'],
        ])->first();

        if (! $assignment) {
            return $this->sendError('ASSIGNMENT_NOT_FOUND', 200);
        }

        $assignment->delete();

        return $this->sendResponse('MEMBER_REMOVED', []);
    }

    public function updateRole(Request $request, string $guid = '')
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        $rules = [
            'user_id'              => ['required', 'integer', 'exists:users,id'],
            'organization_role_id' => ['required', 'integer', 'exists:organization_roles,id'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $role = OrganizationRole::where('id', $validated['organization_role_id'])
            ->where('status', 'active')
            ->first();
        if (! $role) {
            return $this->sendError('ROLE_NOT_FOUND_OR_INACTIVE');
        }

        $assignment = OrganizationUserAssignment::where([
            'firm_id' => $firm->id,
            'user_id' => $validated['user_id'],
        ])->first();

        if (! $assignment) {
            return $this->sendError('ASSIGNMENT_NOT_FOUND', 200);
        }

        if ($assignment->organization_role_id === $validated['organization_role_id']) {
            return $this->sendError('ROLE_ALREADY_ASSIGNED');
        }

        $assignment->update(['organization_role_id' => $validated['organization_role_id']]);

        $assignment->load([
            'user:id,guid,first_name,last_name,email,mobile',
            'organizationRole:id,code,name',
        ]);

        return $this->sendResponse('ROLE_UPDATED', $assignment);
    }

    private function mapUsers($assignments)
    {
        if (! $assignments) {
            return [];
        }

        return $assignments->map(fn ($a) => [
            'id'         => $a->user->id,
            'guid'       => $a->user->guid,
            'first_name' => $a->user->first_name,
            'last_name'  => $a->user->last_name,
            'email'      => $a->user->email,
            'mobile'     => $a->user->mobile,
            'role_name'  => $a->organizationRole->name,
        ])->values()->all();
    }
}
