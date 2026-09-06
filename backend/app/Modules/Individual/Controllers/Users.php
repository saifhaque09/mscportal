<?php

namespace App\Modules\Individual\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Encryption\DecryptException;
use Validator;

use App\Helpers\Common;
use App\Models\User;
use App\Modules\Users\Models\Meta;
use App\Modules\Users\Models\Role;
use App\Mail\MailSMTP;
use App\Http\Controllers\BaseController;
use App\Modules\Individual\Models\Firm;
use App\Modules\Organizations\Models\IndividualUserAssignment;

class Users extends BaseController {

    public function getAll (Request $request) {

      /*  $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError ("BUSINESS_NOT_FOUND");
        }*/

        $filters = Config::get('users.filters');
        $order_by = Config::get('users.order_by');

        $rules = [
			'search' => ['nullable', 'string'],
			'results_per_page' => ['nullable', 'numeric'],
			'page' => ['nullable', 'numeric'],
			'order_by' => ['nullable', 'string', Rule::in($order_by)],
			'status' => ['nullable', 'array'],
			'roles' => ['nullable', 'array'],
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
            $status = ( isset($validated['status'])) ? $validated['status'] : [];
            $roles = ( isset($validated['roles'])) ? $validated['roles'] : [];          

            // $roleIds = Role::whereIn('name', $roles)->pluck('id')->toArray();
            /*$sql = User::whereAny(['first_name', 'mobile', 'last_name', 'email'], 'like', "%$search%");
            $sql = $sql->where('firm_id', $firm->id);
            if (!empty($status)) {
                $sql = $sql->whereIn('status', $status);
            }
             $sql = $sql->with(['roles'=>function ($query) use ($roles) {
                if (!empty($roles)) {
                    $query->select ('id', 'name', 'description');
                    $query->whereIn('name', $roles);
                }
            }]);
            $sql = $sql->orderBy($order_by, 'desc');*/
            /* 
            $sql = $sql->join('model_has_roles', function (JoinClause $join) use ($roleIds) {
                $join->on('users.id', '=', 'model_has_roles.model_id');
                if (! empty ($roleIds)) {
                    $join->whereIn('model_has_roles.role_id', $roleIds);
                }
            });
            $sql = $sql->join('roles', 'model_has_roles.role_id', '=', 'roles.id');
            $sql = $sql->select('users.*', 'roles.name as role_name', 'roles.id as role_id', 'roles.description as role_description');
            */

            $sql = User::whereAny(['first_name', 'mobile', 'last_name', 'email'], 'like', "%$search%")
                ->where('firm_id', $firm->id)

                // Exclude users already present in the invites table
                ->whereNotExists(function ($query) {
                    $query->select(DB::raw(1))
                        ->from('invites')
                        ->where(function ($inviteQuery) {
                            $inviteQuery->whereColumn('invites.email', 'users.email')
                                ->orWhere(function ($mobileQuery) {
                                    $mobileQuery->whereNotNull('users.mobile')
                                        ->whereNotNull('invites.mobile')
                                        ->whereColumn('invites.mobile', 'users.mobile');
                                });
                        });
                })

                // Filter users who have role = Taxfiler
                ->whereHas('roles', function ($query) {
                    $query->where('name', 'Taxfiler');
                });

            if (!empty($status)) {
                $sql->whereIn('status', $status);
            }

            $sql->with(['roles' => function ($query) {
                $query->select('id', 'name', 'description')
                    ->where('name', 'Taxfiler');
            }]);

            $sql->orderBy($order_by, 'desc');

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

    public function listTaxfilers(Request $request) {

        if (! auth()->user()->can('users.view')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

      /*  $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError ("BUSINESS_NOT_FOUND");
        }*/

        $filters = Config::get('users.filters');
        $order_by = Config::get('users.order_by');

        $rules = [
			'search' => ['nullable', 'string'],
			'results_per_page' => ['nullable', 'numeric'],
			'page' => ['nullable', 'numeric'],
			'order_by' => ['nullable', 'string', Rule::in($order_by)],
			'status' => ['nullable', 'array'],
			'roles' => ['nullable', 'array'],
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
            $roles = ( isset($validated['roles'])) ? $validated['roles'] : ['Taxfiler'];

             $sql = User::whereAny(['first_name', 'mobile', 'last_name', 'email'], 'like', "%$search%")

                // Exclude users already present in the invites table
                ->whereNotExists(function ($query) {
                    $query->select(DB::raw(1))
                        ->from('invites')
                        ->where(function ($inviteQuery) {
                            $inviteQuery->whereColumn('invites.email', 'users.email')
                                ->orWhere(function ($mobileQuery) {
                                    $mobileQuery->whereNotNull('users.mobile')
                                        ->whereNotNull('invites.mobile')
                                        ->whereColumn('invites.mobile', 'users.mobile');
                                });
                        });
                })

                // Filter users who have role = Taxfiler
                ->whereHas('roles', function ($query) use ($roles) {
                    $query->whereIn('name', $roles);
                });

            // Admin sees every taxfiler. Non-Admin staff (Accountant/Staff)
            // only see taxfilers they hold an individual_user_assignments
            // role on, plus any taxfiler with no assignments at all yet —
            // the latter keeps existing data visible to all staff until
            // Admin explicitly builds a team for that client, rather than
            // hiding every pre-existing taxfiler the moment this shipped.
            if (! auth()->user()->hasRole('Admin')) {
                $actorId = auth()->id();
                $sql->where(function ($query) use ($actorId) {
                    $query->whereDoesntHave('individualAssignments')
                        ->orWhereHas('individualAssignments', function ($assignmentQuery) use ($actorId) {
                            $assignmentQuery->where('user_id', $actorId);
                        });
                });
            }

            if (!empty($status)) {
                $sql->whereIn('status', $status);
            }

            $sql->with([
                'roles' => function ($query) use ($roles) {
                    $query->select('id', 'name', 'description')
                        ->whereIn('name', $roles);
                },
                'taxCategories' => function ($query) {
                    $query->select('tax_categories.id', 'tax_categories.name');
                },
                'individualAssignments.user:id,guid,first_name,last_name,email',
                'individualAssignments.organizationRole:id,code,name',
            ]);

            $sql->orderBy($order_by, 'desc');

            // Pagination
            $total_results = $sql->count ();
            $max = ceil ($total_results / $results_per_page);
            for ($i=1; $i<=$max; $i++) {
                if ($i == $page) {
                    $offset = ($i-1) * $results_per_page;
                }
            }

            $records = $sql->limit($results_per_page)->offset($offset)->get()
                ->map(function ($user) {
                    // meta is `encrypted:array` — a row encrypted under a
                    // different/rotated APP_KEY throws DecryptException on
                    // access and would otherwise 500 the entire list for one
                    // bad row. Null it out for this response and log which
                    // user needs a data fix, instead of failing the request.
                    try {
                        $user->meta;
                    } catch (DecryptException $e) {
                        Log::warning('Undecryptable user meta', ['user_id' => $user->id, 'error' => $e->getMessage()]);
                        $user->setRawAttributes(array_merge($user->getAttributes(), ['meta' => null]));
                    }

                    $latestYear = $user->taxCategories
                        ->pluck('pivot.year')
                        ->filter()
                        ->max();

                    $latestCategories = $user->taxCategories
                        ->filter(function ($category) use ($latestYear) {
                            return $category->pivot->year == $latestYear;
                        })
                        ->pluck('name')
                        ->filter()
                        ->unique()
                        ->implode(', ');

                    $user->year = $latestYear;
                    $user->categories = $latestCategories;
                    $user->team = $user->individualAssignments->map(fn ($a) => [
                        'id'         => $a->user->id,
                        'guid'       => $a->user->guid,
                        'first_name' => $a->user->first_name,
                        'last_name'  => $a->user->last_name,
                        'email'      => $a->user->email,
                        'role_name'  => $a->organizationRole->name,
                    ])->values();
                    unset($user->taxCategories, $user->individualAssignments);

                    return $user;
                });

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

    public function getIndividualCount()
    {
        $query = User::whereNull('firm_id')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('invites')
                    ->where(function ($inviteQuery) {
                        $inviteQuery->whereColumn('invites.email', 'users.email')
                            ->orWhere(function ($mobileQuery) {
                                $mobileQuery->whereNotNull('users.mobile')
                                    ->whereNotNull('invites.mobile')
                                    ->whereColumn('invites.mobile', 'users.mobile');
                            });
                    });
            })
            // firm_id is also null for Admin/Accountant/Staff/Taxfiler alike —
            // without this, their own accounts were being counted as
            // "individual clients" too.
            ->whereHas('roles', function ($query) {
                $query->where('name', 'Taxfiler');
            });

        // Admin sees every taxfiler; Accountant/Staff see only taxfilers
        // they hold an individual_user_assignments role on, plus any
        // taxfiler with no assignments yet — same scope as listTaxfilers().
        if (! auth()->user()->hasRole('Admin')) {
            $actorId = auth()->id();
            $query->where(function ($q) use ($actorId) {
                $q->whereDoesntHave('individualAssignments')
                    ->orWhereHas('individualAssignments', function ($assignmentQuery) use ($actorId) {
                        $assignmentQuery->where('user_id', $actorId);
                    });
            });
        }

        return $this->sendResponse('COUNT_FETCHED', [
            'total_individual_count' => $query->count(),
        ]);
    }

}
