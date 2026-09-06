<?php

namespace App\Modules\Users\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use App\Http\Controllers\BaseController;
use Illuminate\Validation\Rule;
use App\Modules\Users\Models\Role;
use Spatie\Permission\Models\Permission;
use Validator;

use App\Helpers\Common;
use App\Models\User;

class Roles extends BaseController {

    public function getAll (Request $request) {

        $filters = Config::get('users.filters');
        $order_by = Config::get('users.order_by');

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
            $order_by 			= $filters['order_by'];
            $offset 			= $filters['offset'];

            $results_per_page = ( ! isset($validated['results_per_page'])) ? $results_per_page : $validated['results_per_page'];
            $search = ( ! isset($validated['search'])) ? $search : $validated['search'];
            $page = ( ! isset($validated['page'])) ? $page : $validated['page'];
            $order_by = ( ! isset($validated['order_by'])) ? $order_by : $validated['order_by'];

            $total_results = Role::where('name', 'like', "%$search%")->count ();

            $max = ceil ($total_results / $results_per_page);
            for ($i=1; $i<=$max; $i++) {
                if ($i == $page) {
                    $offset = ($i-1) * $results_per_page;
                }
            }

            $records = Role::where('name', 'like', "%$search%")
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

    // Get single record
	public function getOne (Request $request, int $id=0) {

        $record = Role::where('id', $id)->first ();
        if ( $record ) {
            return $this->sendResponse ('RECORDS_FOUND', $record);
        } else {
            return $this->sendError ('RECORDS_NOT_FOUND', 200);
        }
    }

    /**
     * Create a new record
     */
    public function store (Request $request, string $id='' ) {

        $rules = [
			'name' => [
                'required',
                'string',
                "min:1",
                Rule::unique(Role::class)->where (function ($query) {
                    $query->where ('guard_name', '!=', 'sanctum');
                })
            ],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();

            // Update logic
            if ( ! empty ($id)) {

                // Update the role name
                $role = Role::where ('id', $id)->update (['name'=>$validated['name']]);

            } else {

                // create a new role
                // Guard must match the app's default auth guard ('web') so that
                // role/permission middleware (which resolves against the
                // authenticated guard) actually recognizes roles created here —
                // this previously hardcoded 'api', which never matched.
                $role = Role::create([
                    'guard_name' => config('auth.defaults.guard'),
                    'name' => $validated['name']
                ]);
            }

            // Set response
            if ($role) {
                $message = is_int ($role) ? 'ROLE_UPDATED' : 'ROLE_CREATED';
                return $this->sendResponse ($message, $role);
            } else {
                return $this->sendError ('ROLE_NOT_CREATED');
            }
        }
    }

    // assign role to users
    public function addUsers (Request $request, int $role_id=0) {

        $role = Role::find ($role_id);

        if ($role) {

            //$role->givePermissionTo ('edit articles');

            $rules = [
                'users' => ['required', 'list'],
            ];

            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return $this->sendError ($validator->errors());
            } else {

                // Retrieve the validated input...
                $validated = $validator->validated();
                $users = $validated['users'];
                if  (! empty ($users)) {
                    foreach ($users as $guid) {
                        $user = User::where ('guid', $guid)->first ();
                        if ($user) {
                            $user->assignRole($role);
                        }
                    }
                    return $this->sendResponse ('ROLE_ASSIGNED');
                } else {
                    return $this->sendError ('USERS_NOT_FOUND');
                }
            }
        } else {
            return $this->sendError ('ROLE_NOT_FOUND');
        }
    }


    // Delete (permanentaly)
	public function delete (int $id=0) {

            $record = Role::where('id', $id)->forceDelete ();
            if ($record) {
                return $this->sendResponse ('RECORDS_DELETED');
            } else {
                return $this->sendError ('RECORDS_NOT_FOUND', 200);
            }

    }





}
