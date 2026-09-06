<?php

namespace App\Modules\Clients\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\Mail;
use Validator;

use App\Helpers\Common;
use App\Models\User;
use App\Modules\Users\Models\Meta;
use App\Modules\Users\Models\Role;
use App\Mail\MailSMTP;
use App\Http\Controllers\BaseController;
use App\Modules\Clients\Models\Firm;

class Users extends BaseController {

    public function getAll (Request $request, string $guid='') {

        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError ("BUSINESS_NOT_FOUND");
        }

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
            $sql = User::whereAny(['first_name', 'mobile', 'last_name', 'email'], 'like', "%$search%");
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
            $sql = $sql->orderBy($order_by, 'desc');
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

}
