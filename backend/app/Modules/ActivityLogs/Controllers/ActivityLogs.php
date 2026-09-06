<?php

namespace App\Modules\ActivityLogs\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Config;
use Validator;

use App\Http\Controllers\BaseController;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Organizations\Models\OrganizationUserAssignment;

class ActivityLogs extends BaseController
{
    /**
     * List activity log entries visible to the authenticated user, with
     * filters. Scope depends on role: Admin sees only their own actions
     * here (full cross-user browsing is getAllForAdmin()); Accountant/Staff
     * see their own actions plus every user belonging to a firm they hold
     * an active access_business_account assignment on; Client sees their
     * own actions plus every user at their own firm (the Client/Employee
     * accounts they invited); everyone else (Employee, Taxfiler, unassigned)
     * sees only their own actions.
     */
    public function getAll(Request $request)
    {
        $rules = [
            'log_name'         => ['nullable', 'array'],
            'log_name.*'       => ['string'],
            'from_date'        => ['nullable', 'date'],
            'to_date'          => ['nullable', 'date', 'after_or_equal:from_date'],
            'search'           => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
            'order_by'         => ['nullable', 'string', Rule::in(Config::get('activity-logs.order_by'))],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $user = auth()->user();
        $sql = ActivityLog::query();
        $showsOtherUsers = false;

        if ($user->hasRole('Admin')) {
            $sql->where('user_id', $user->id);
        } elseif ($user->can('firms.manage')) {
            $firmIds = OrganizationUserAssignment::where('user_id', $user->id)
                ->whereHas('organizationRole', function ($query) {
                    $query->where('status', 'active')
                        ->whereHas('permissions', function ($permQuery) {
                            $permQuery->where('code', 'access_business_account')->where('status', 'active');
                        });
                })
                ->pluck('firm_id');

            $sql->where(function ($query) use ($user, $firmIds) {
                $query->where('user_id', $user->id)
                    ->orWhereHas('user', fn ($userQuery) => $userQuery->whereIn('firm_id', $firmIds));
            });
            $showsOtherUsers = true;
        } elseif ($user->firm_id) {
            $sql->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->orWhereHas('user', fn ($userQuery) => $userQuery->where('firm_id', $user->firm_id));
            });
            $showsOtherUsers = true;
        } else {
            $sql->where('user_id', $user->id);
        }

        return $this->paginate($sql, $validator->validated(), withUser: $showsOtherUsers);
    }

    /**
     * Admin-only: list activity log entries across ALL users, with filters
     * (log_name, search, date range, and optionally a single user via user_id/user_guid).
     */
    public function getAllForAdmin(Request $request)
    {
        $rules = [
            'log_name'         => ['nullable', 'array'],
            'log_name.*'       => ['string'],
            'user_id'          => ['nullable', 'integer', 'exists:users,id'],
            'user_guid'        => ['nullable', 'string', 'exists:users,guid'],
            'from_date'        => ['nullable', 'date'],
            'to_date'          => ['nullable', 'date', 'after_or_equal:from_date'],
            'search'           => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
            'order_by'         => ['nullable', 'string', Rule::in(Config::get('activity-logs.order_by'))],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $sql = ActivityLog::query();

        if (!empty($validated['user_id'])) {
            $sql = $sql->where('user_id', $validated['user_id']);
        } elseif (!empty($validated['user_guid'])) {
            $sql = $sql->whereHas('user', fn ($q) => $q->where('guid', $validated['user_guid']));
        }

        return $this->paginate($sql, $validated, withUser: true);
    }

    /**
     * Shared filter/sort/pagination logic for both getAll() (self-scoped) and
     * getAllForAdmin() (all-users, already scoped by caller before this runs).
     */
    private function paginate($sql, array $validated, bool $withUser = false)
    {
        $filters = Config::get('activity-logs.filters');

        $results_per_page = $validated['results_per_page'] ?? $filters['results_per_page'];
        $search           = $validated['search']           ?? $filters['search'];
        $page             = $validated['page']              ?? $filters['page'];
        $order_by         = $validated['order_by']          ?? $filters['order_by'];
        $log_names        = $validated['log_name']          ?? [];
        $from_date        = $validated['from_date']         ?? null;
        $to_date          = $validated['to_date']           ?? null;

        // 'user' is deliberately column-limited — never eager-load the full
        // User model here. It has an `encrypted:array` `meta` column (SIN,
        // DOB, banking details); pulling it in unfiltered both leaks other
        // firm members' private data into an activity-log listing and — if
        // that user's meta was ever corrupted (see ROUTER.md DecryptException
        // entries) — throws an uncaught DecryptException while serializing
        // the response.
        $sql = $sql->with($withUser ? ['document', 'user:id,guid,first_name,last_name,email'] : ['document']);

        if (!empty($log_names)) {
            $sql = $sql->whereIn('log_name', $log_names);
        }

        if (!empty($search)) {
            $sql = $sql->where(function ($query) use ($search, $withUser) {
                $query->where('description', 'like', "%$search%");
                if ($withUser) {
                    $query->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->whereAny(['first_name', 'last_name', 'email'], 'like', "%$search%");
                    });
                }
            });
        }

        if ($from_date) {
            $sql = $sql->whereDate('timestamp', '>=', $from_date);
        }

        if ($to_date) {
            $sql = $sql->whereDate('timestamp', '<=', $to_date);
        }

        // oldest_first is a synonym for newest_last (both ascending); oldest_last
        // for newest_first (both descending) — see config note above.
        $ascending = in_array($order_by, ['newest_last', 'oldest_first'], true);
        $sql = $sql->orderBy('timestamp', $ascending ? 'asc' : 'desc');

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
}
