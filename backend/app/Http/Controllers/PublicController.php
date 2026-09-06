<?php

namespace App\Http\Controllers;

use Illuminate\Validation\Rule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Validator;

use App\Http\Controllers\BaseController;
use App\Modules\Users\Models\Role;
use App\Modules\Users\Models\ACL;
use App\Modules\ActivityLogs\Models\ActivityLog;

class PublicController extends BaseController {

    public function getACL (Request $request) {

        $rules = [
			'role' => [ 'nullable', 'string' ],
			'path' => [ 'nullable', 'string' ],
		];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();
            $role = $validated['role'] ?? null;
            $path = $validated['path'] ?? null;

            $query = ACL::where('status', 1);
            $query = $query->with('children');
            if ($role) {
                $role = Role::where ('name', $role)->first ();
                if ($role) {
                    $query = $query->where ('role_id', $role->id);
                }
            }
            if ($path) {
                $query = $query->where ('path', $path);
            }
            $query = $query->get ();
            return $this->sendResponse('ACL', $query);
        }
    }


    public function createACL (Request $request) {

        $rules = [
			'role' => [ 'required', 'string' ],
			'path' => [ 'required', 'string' ],
			'category' => [ 'required', 'in:acl,url' ],
			'title' => [ 'required', 'string' ],
			'group' => [ 'nullable', 'string' ],
			'menu_order' => [ 'nullable', 'integer' ],
			'controller' => [ 'nullable', 'string' ],
			'action' => [ 'nullable', 'string' ],
			'status' => [ 'nullable', 'integer' ],
			'icon' => [ 'nullable', 'string' ],
            'options' => ['nullable'],
			'parent_id' => [ 'nullable', 'integer' ],
		];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();
            $role = Role::where ('name', $validated['role'])->first ();
            if ($role) {
                $data = [
                    'role_id' => $role['id'],
                    'group' => isset ($validated['group']) ? $validated['group'] : 'web',
                    'category' => $validated['category'],
                    'path' => $validated['path'],
                    'title' => $validated['title'],
                    'menu_order' => isset ($validated['menu_order']) ? $validated['menu_order'] : '1',
                    'controller' => isset ($validated['controller']) ? $validated['controller'] : NULL,
                    'action' => isset ($validated['action']) ? $validated['action'] : NULL,
                    'status' => isset ($validated['status']) ? $validated['status'] : '1',
                    'icon' => isset ($validated['icon']) ? $validated['icon'] : '',
                    'options' => isset ($validated['options']) ? $validated['options'] : '',
                    'parent_id' => isset ($validated['parent_id']) ? $validated['parent_id'] : null,
                ];
                ACL::upsert ($data, ['role_id', 'group', 'path', 'category'], ['icon', 'options', 'title', 'parent_id', 'menu_order', 'controller', 'action', 'status']);
                return $this->sendResponse('ADDED', $data);
            } else {
                return $this->sendError('ROLE_NOT_FOUND');
            }
        }
    }

    public function editACL (Request $request, int $id=0) {

        $acl = ACL::find ($id);
        if (! $acl) {
            return $this->sendError ('ACL_NOT_FOUND');
        }

        $rules = [
			'path' => [ 'required', 'string', Rule::unique('acl')->where(fn ($query) => $query->where('category', $request->category)) ],
			'category' => [ 'nullable', 'in:acl,url' ],
			'title' => [ 'nullable', 'string' ],
			'group' => [ 'nullable', 'string' ],
			'icon' => [ 'nullable', 'string' ],
            'options' => ['nullable'],
			'parent_id' => [ 'nullable', 'integer' ],
		];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
            // Retrieve the validated input...
            $validated = $validator->validated();
            $data = [
                'path' => $validated['path'],
                'category' => $validated['category'] ?? $acl->category,
                'title' => $validated['title'] ?? $acl->title,
                'group' =>  $validated['group'] ?? $acl->group,
                'icon' =>  $validated['icon'] ?? $acl->icon,
                'options' =>  $validated['options'] ?? $acl->options,
                'parent_id' =>  $validated['parent_id'] ?? $acl->parent_id,
            ];
            $query = ACL::where('id', $id)->update ($data);
            $payload = $acl->fresh();
            return $this->sendResponse('ACL_UPDATED', $payload);
        }
    }


    public function assignACL (Request $request, int $id=0) {

        $rules = [
			'acl' => ['required', 'list'],
		];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            $role = Role::find($id);
            $i = 0;
            if ($role) {

                $validated = $validator->validated();
                $list = $validated['acl'];

                foreach ($list as $acl_id) {

                    $acl = ACL::find($acl_id);
                    if ($acl) {

                        $data = [
                            'role_id' => $role->id,
                            'acl_id' => $acl->id,
                        ];
                        $query = DB::table('acl_roles')->upsert ($data, ['acl_id', 'role_id'], ['acl_id', 'role_id']);
                        $i++;
                    }
                }
            }
            if ($i > 0) {
                ActivityLog::record('roles', 'editing permissions', null, auth()->id());
                return $this->sendResponse('ADDED');
            } else {
                return $this->sendError('INCORRECT_ROLEID_OR_ACLID');
            }
        }
    }

    public function deleteACL (Request $request, int $id=0) {
        $query = ACL::where ('id', $id)->forceDelete ();
        return $this->sendResponse('ADDED', $query);
    }

    public function assignRolesToUsersWithoutRoles () {
        $users = \App\Models\User::doesntHave('roles')->get();
        $role = Role::where('name', 'Learner')->first();
        $i = 0;
        foreach ($users as $user) {
            $user->assignRole($role);
            $i++;
        }
        return $this->sendResponse('ASSIGNED', ['num_users'=>$i]);
    }


}
