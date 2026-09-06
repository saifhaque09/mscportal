<?php

namespace App\Modules\Organizations\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Validator;
use App\Http\Controllers\BaseController;
use App\Models\User;
use App\Modules\Organizations\Models\OrganizationRole;
use App\Modules\Organizations\Models\IndividualUserAssignment;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Notifications\Models\Notification;

/**
 * The Individual/Taxfiler-client counterpart to Organizations\Firms — same
 * organization_roles/organization_permissions catalog (see that class's
 * getRoles/getPermissions/createRole/editRole/deleteRole, reused as-is,
 * unchanged), just a separate assignment table since the "client entity"
 * here is a taxfiler user row rather than a firm.
 */
class Taxfilers extends BaseController {

    private function findTaxfiler(string $guid): ?User
    {
        return User::where('guid', $guid)
            ->whereHas('roles', fn ($q) => $q->where('name', 'Taxfiler'))
            ->first();
    }

    public function assignRole(Request $request, string $guid = '')
    {
        $taxfiler = $this->findTaxfiler($guid);
        if (! $taxfiler) {
            return $this->sendError('TAXFILER_NOT_FOUND');
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

        // Same one-user-per-role-per-client rule as the firm side — only
        // the exact same role twice on the same taxfiler is meaningless,
        // enforced here plus the ind_user_role_unique DB constraint.
        $roleOccupied = IndividualUserAssignment::where([
            'taxfiler_id'          => $taxfiler->id,
            'organization_role_id' => $validated['organization_role_id'],
        ])->exists();

        if ($roleOccupied) {
            return $this->sendError('ROLE_ALREADY_OCCUPIED_FOR_TAXFILER');
        }

        $assignment = IndividualUserAssignment::create([
            'taxfiler_id'          => $taxfiler->id,
            'user_id'              => $validated['user_id'],
            'organization_role_id' => $validated['organization_role_id'],
        ]);

        $assignment->load([
            'user:id,guid,first_name,last_name,email,mobile',
            'organizationRole:id,code,name',
        ]);

        ActivityLog::record('role', 'Assign role', null, auth()->id());

        $this->notifyRoleAssigned($assignment, $taxfiler);

        return $this->sendResponse('ROLE_ASSIGNED', $assignment);
    }

    private function notifyRoleAssigned(IndividualUserAssignment $assignment, User $taxfiler): void
    {
        $taxfilerName = trim("{$taxfiler->first_name} {$taxfiler->last_name}") ?: $taxfiler->email;

        Notification::record(
            $assignment->user_id,
            'Client role assigned',
            "You have been assigned the role \"{$assignment->organizationRole->name}\" for {$taxfilerName}.",
            'individual_role_assigned',
            auth()->id()
        );
    }

    /**
     * Self-service: the authenticated Taxfiler's own assigned team, for
     * their dashboard's "Your Accountant" card. No guid lookup needed
     * (always "myself"), no organizations.manage permission required.
     */
    public function myTeam()
    {
        $taxfiler = auth()->user();
        if (! $taxfiler || ! $taxfiler->hasRole('Taxfiler')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $assignments = IndividualUserAssignment::where('taxfiler_id', $taxfiler->id)
            ->with([
                'user:id,guid,first_name,last_name,email,mobile',
                'organizationRole:id,code,name',
            ])
            ->get();

        return $this->sendResponse('TEAM_FOUND', [
            'team' => $this->mapUsers($assignments),
        ]);
    }

    public function getMembers(Request $request, string $guid = '')
    {
        $taxfiler = $this->findTaxfiler($guid);
        if (! $taxfiler) {
            return $this->sendError('TAXFILER_NOT_FOUND');
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

        $paginated = IndividualUserAssignment::where('taxfiler_id', $taxfiler->id)
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
        $allRoles = OrganizationRole::where('status', 'active')->orderBy('id')->get();
        $byRoleId = collect($paginated->items())->groupBy('organization_role_id');

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
            'taxfiler_id' => $taxfiler->id,
            'guid'        => $taxfiler->guid,
            'first_name'  => $taxfiler->first_name,
            'last_name'   => $taxfiler->last_name,
        ], $roleGroups);

        return $this->sendResponse('MEMBERS_FOUND', $payload);
    }

    public function removeRole(Request $request, string $guid = '')
    {
        $taxfiler = $this->findTaxfiler($guid);
        if (! $taxfiler) {
            return $this->sendError('TAXFILER_NOT_FOUND');
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

        $assignment = IndividualUserAssignment::where([
            'taxfiler_id'          => $taxfiler->id,
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
        $taxfiler = $this->findTaxfiler($guid);
        if (! $taxfiler) {
            return $this->sendError('TAXFILER_NOT_FOUND');
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

        $assignment = IndividualUserAssignment::where([
            'taxfiler_id' => $taxfiler->id,
            'user_id'     => $validated['user_id'],
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
