<?php

namespace App\Modules\Users\Controllers;

use Illuminate\Http\Request;
use App\Http\Controllers\BaseController;
use Illuminate\Validation\Rules\File;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Illuminate\Support\Arr;
use Validator;

use App\Helpers\Common;
use App\Models\User;
use App\Modules\Users\Models\Batch;
use App\Modules\Users\Models\Role;

class Reports extends BaseController {

    public function usersByRole (Request $request) {

        $rules = [
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();

            $roles = Role::all()->pluck('name')->toArray();
            $users = [];
            if (! empty ($roles)) {
                foreach ($roles as $role) {
                    $users[$role] = User::with('roles')->get()->filter(
                        fn ($user) => $user->roles->where('name', $role)->toArray()
                    )->count();
                }
                return $this->sendResponse ('RECORDS_FOUND', $users);
            }
        }
    }
}
