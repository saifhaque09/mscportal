<?php

namespace App\Modules\Settings\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Validator;

use App\Models\User;
use App\Modules\Files\Models\File As FileModel;
use App\Modules\Settings\Models\Setting;
use App\Modules\Files\Controllers\Files;
use App\Http\Controllers\BaseController;

class Settings extends BaseController {

    /**
     * Display a listing of settings
     */
    public function getSettings (string $context='', $return=0) {

        // Org-wide default row(s) for this context: user_id = 0.
        $defaults = Setting::where('context', $context)->where('user_id', 0)->get();
        $config = [];
        foreach ($defaults as $setting) {
            $config[$setting['key']] = $setting['value'];
        }

        // For 'general' (appearance), the caller's own personal picks override
        // the org default on a per-key basis.
        if ($context == 'general') {
            $user_id = auth('sanctum')->id() ?? 0;
            if ($user_id) {
                $personal = Setting::where('context', $context)->where('user_id', $user_id)->get();
                foreach ($personal as $setting) {
                    $config[$setting['key']] = $setting['value'];
                }
            }
        }

        if (empty($config)) {
        $config = [
            'app_name' => config('app.name', 'MSC Accounting portal'),
            'logo_url' => asset('storage/default/msclogo.png'),
            'favicon_url' => asset('storage/default/favicon.png'),
        ];
    }
        if ($return == 1) {
            return $config;
        } else {
            if (empty ($config)) {
                return $this->sendError('NO_RECORDS_FOUND');
            }
            return $this->sendResponse ('RECORDS_FOUND', $config);
        }
    }


    /**
     * Add settings
     */
    public function saveSettings (Request $request, string $context='') {

        // 'general' is per-user appearance preference (self-service, no
        // permission needed beyond being logged in). Every other context
        // (app/login/registration) is a platform-wide setting — e.g. this is
        // where two_factor_authentication and disable_user_registration live
        // — and must be restricted to users with settings.manage.
        if ($context != 'general' && ! auth()->user()->can('settings.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $config = Config::get('settings');

        if ($context == 'registration') {
            $rules = [
                'disable_user_registration'=> ['nullable', 'boolean'],
            ];
        }

        if ($context == 'login') {
            $rules = [
                'single_device_login_only'=> ['nullable', 'boolean'],
                'two_factor_authentication'=> ['nullable', 'boolean'],
            ];
        }

        if ($context == 'app') {
            $rules = [
                'app_name'=> ['nullable', 'string', 'max:100'],
                'domain_name'=> ['nullable', 'string', 'max:100'],
            ];
        }
        if ($context == 'general') {
            $rules = [
                'theme'=> ['nullable', 'in:dark,light,custom'],
                'font_family'=> ['nullable', 'string', 'max:100'],
                'text_color_body'=> ['nullable', 'hex_color'],
                'text_color_heading'=> ['nullable', 'hex_color'],
                'button_color_background_normal'=> ['nullable', 'hex_color'],
                'button_color_text_normal'=> ['nullable', 'hex_color'],
                'button_color_background_hover'=> ['nullable', 'hex_color'],
                'button_color_text_hover'=> ['nullable', 'hex_color'],
                'set_as_default'=> ['nullable', 'boolean'],
            ];
        }

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

        /* if ($context == 'app' && $user->hasRole('Accountant')) {
            return $this->sendError ('ROLE');
        } */

            $validated = $validator->validated();
            $setAsDefault = (bool) ($validated['set_as_default'] ?? false);
            unset($validated['set_as_default']);

            if ($context == 'general' && $setAsDefault && ! auth()->user()->hasRole('Admin')) {
                return $this->sendError('ONLY_ADMIN_CAN_SET_DEFAULT');
            }

            if ($context == 'general') {
                $user_id = $setAsDefault ? 0 : (auth()->user()->id ?? 0);
            } else {
                $user_id = 0;
            }

            $settings = null;

            if (! empty ($validated)) {
                foreach ($validated as $key=>$val) {
                    if (! is_null ($val)) {
                        $data = [];
                        $data['key'] = $key;
                        $data['user_id'] = $user_id;
                        $data['value'] = $val;
                        $data['context'] = $context;
                        $settings = Setting::upsert($data, ['context', 'key', 'user_id'], ['value']);
                    }
                }
            }
            if ($settings) {
                return $this->sendResponse ('RECORDS_UPDATED');
            } else {
                return $this->sendError ('RECORDS_NOT_UPDATED');
            }
        }
    }

    public function uploadFile (Request $request, string $context='') {

        if (! auth()->user()->can('settings.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        if ($context != 'app') {
            return $this->sendError('INVALID_REQUEST');
        }

        $group = Config::get ('files.group_3');
        $max = Config::get ('files.max_upload_size');
        $allowed = Config::get ('files.allowed_types.image');

        // Validate the request...
        $rules = [
			'uploadfile' => ["required", File::types($allowed)->max($max)],
			'alt' => ["nullable", 'string', 'max:100'],
			'group' => ['required', Rule::in($group)],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();
            $group = $validated['group'];
            $path = $group;
            
            if ($request->file('uploadfile')->isValid()) {
                
                // Store the new file
                $files = new Files();

                // Check if there is a logo uploaded
                $query = Setting::where ('context', 'app')->where ('key', $group)->first();
                $file_id = $query ? $query->value : null;
                
                // Delete the image if it exists
                if (isset ($file_id) && $file_id > 0) {
                    $file = $files->get ($file_id);
                    if ($file) {
                        // Delete the file
                        $files->delete ($file->file_path);
                        // Unlink the file from the user
                        $files->unlink ($file->id);
                    }
                }

                $uploadedFile = $request->file('uploadfile');
                $extension = $uploadedFile->extension();
                $name = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
                $file_name = Str::slug($name) . '.' . $extension;
                $data = $files->store ($request, $uploadedFile, $group, $file_name, $path);

                // Link the file to the settings (app context is always shared/global)
                $setting['key'] = $group;
                $setting['value'] = $data['file_id'];
                $setting['user_id'] = 0;
                $setting['context'] = 'app';
                Setting::upsert($setting, ['context', 'key', 'user_id'], ['value']);

                return $this->sendResponse ('FILE_UPLOADED', $data);
            } else {
                return $this->sendError ('INVALID_FILE');
            }
        }

    }


    public function getFile (Request $request) {

        $group = Config::get ('files.group_3');

        // Validate the request...
        $rules = [
            'group' => ['required', Rule::in($group)],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();
            $group = $validated['group'];

            $files = new Files();

            // Check if the user has a profile picture
            $query = Setting::where (['context'=>'app', 'key'=>$group])->first();
            $file_id = $query ? $query->value : null;
            if (isset ($file_id) && $file_id > 0) {
                $file = $files->get ($file_id);
                if ($file) {
                    $file_url = ($file['file_path']);
                    return $this->sendResponse ('FILE_FOUND', ['file_url'=>$file_url]);
                }
            }
            return $this->sendError ('FILE_NOT_FOUND');
        }
    }

    public function deleteFile (Request $request) {

        if (! auth()->user()->can('settings.manage')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $group = Config::get ('files.group_3');

        // Validate the request...
        $rules = [
            'group' => ['required', Rule::in($group)],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();
            $group = $validated['group'];

            $files = new Files();

            // Check if the user has a profile picture
            $query = Setting::where (['context'=>'app', 'key'=>$group])->first();
            $file_id = $query ? $query->value : null;
            if (isset ($file_id) && $file_id > 0) {
                $file = $files->get ($file_id);

                // Delete the image if it exists
                if ($file) {
                    // Delete the file
                    $files->delete ($file->file_path);
                    // Remove the file record
                    $files->unlink ($file->id);
                    // Remove the meta
                    Setting::where (['context'=>'app', 'key'=>$group])->delete();
                    return $this->sendResponse ('FILES_DELETED');
                }
            }

            return $this->sendError ('FILE_NOT_FOUND');

        }
    }


}
