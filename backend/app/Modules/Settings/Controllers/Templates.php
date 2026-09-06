<?php

namespace App\Modules\Settings\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Validation\Rules\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Validator;

use App\Models\User;
use App\Modules\Files\Models\File As FileModel;
use App\Modules\Settings\Models\Template;
use App\Modules\Files\Controllers\Files;
use App\Http\Controllers\BaseController;

class Templates extends BaseController {

    /**
     * Display a listing of settings
     */
    public function getAllTemplates (string $id='', $return=0) {

        $rows = Template::get ();
        if ($return == 1) {
            return $rows;
        } else {
            // An empty result set is a valid, successful response — not an
            // error — so the frontend doesn't have to special-case it to
            // avoid showing a spurious "failed to fetch" notification.
            return $this->sendResponse ('RECORDS_FOUND', $rows);
        }
    }

    /**
     * Display a listing of settings
     */
    public function getOneTemplate (string $id='', $return=0) {

        $rows = Template::where('id', $id)->first ();
        if ($return == 1) {
            return $rows;
        } else {
            if (empty ($rows)) {
                return $this->sendError('NO_RECORDS_FOUND');
            }
            return $this->sendResponse ('RECORDS_FOUND', $rows);
        }
    }


    /**
     * Add settings
     */
    public function saveTemplate (Request $request, string $id='') {

        $rules = [
            'name'=> ['required', 'string', 'max:100'],
            'subject'=> ['required', 'string', 'max:100'],
            'body'=> ['required', 'string' ],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
            $validated = $validator->validated();
            $user_id = auth()->user()->id ?? NULL;

            $data = [];
            $data['name'] = $validated['name'];
            $data['subject'] = $validated['subject'];
            $data['body'] = $validated['body'];
            $data['created_by'] = $user_id;
            $data['updated_by'] = $user_id;
            Template::where('id', $id)->update($data);
            return $this->sendResponse ('RECORDS_UPDATED');
        }
    }
}