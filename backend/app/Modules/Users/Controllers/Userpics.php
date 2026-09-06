<?php

namespace App\Modules\Users\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use App\Http\Controllers\BaseController;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Validator;

use App\Helpers\Common;
use App\Models\User;
use App\Modules\Files\Models\File As FileModel;
use App\Modules\Users\Models\Meta;
use App\Modules\Files\Controllers\Files;
use App\Modules\ActivityLogs\Models\ActivityLog;

class Userpics extends BaseController {

    /**
     * Upload attachments
     */
    public function upload (Request $request) {

		$groups = Config::get('files.group_2');
		$max = Config::get('files.max_upload_size');
		$allowed = Config::get('files.allowed_types.image');

        $rules = [
			'profile_image' => [ 'required', File::types($allowed)->max($max) ],
			'user_guid' => ['nullable', 'string'],
			'alt' => ["nullable", 'string', 'max:100'],
		];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();

            $user_guid = isset ($validated['user_guid']) ? $validated['user_guid'] : auth()->user()->guid;

            $user = User::where ('guid', $user_guid)->first();
            if (! $user) {
                return $this->sendError ('USER_NOT_FOUND');
            } else {
                if ($request->file('profile_image')->isValid()) {

                    $files = new Files();

                    // Check if the user has a profile picture
                    $query = Meta::where ('user_id', $user->id)->where ('key', 'userpic')->first();
                    $file_id = $query ? $query->value : 0;

                    // Replace: remove the previous profile image (if any) before storing the new one.
                    if (isset ($file_id) && $file_id > 0) {
                        $this->deleteUserpicFile((int) $file_id);
                    }

                    // Store the new file
                    // Must match the `files.group` DB enum ('document','profile_image','logo','favicon','agreement','tax_filer') —
                    // NOT config('files.group_2') which is an unrelated allow-list name.
                    $group = 'profile_image';
                    $uploadedFile = $request->file('profile_image');
                    $extension = $uploadedFile->extension();
                    $file_name = 'userpic_' . $user->id . '.' . $extension;
                    $path = 'userpics/' . $user->guid;
                    $data = $files->store ($request, $uploadedFile, $group, $file_name, $path);

                    // Get file url (signed stream URL, same as every other file exposure — never the raw S3 URL)
                    $data['file_url'] = FileModel::find($data['file_id'])->file_path;

                    // Link the file to the user
                    $meta = [
                        'user_id' => $user->id,
                        'key' => 'userpic',
                        'value' => $data['file_id'],
                    ];

                    Meta::upsert ($meta, ['user_id', 'key'], ['value']);

                    ActivityLog::record('user', "updated {$user->first_name} {$user->last_name} profile image", null, auth()->id());

                    return $this->sendResponse ('FILES_UPLOADED', $data);
                }
            }
        }
    }

    /**
     * Get profile image
     *
     * @param Request $request
     *
     **/
    public function get (Request $request) {

        // Validate the request...
        $rules = [
            'user_guid' => ['nullable', 'string'],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            $validated = $validator->validated();

            $user_guid = isset ($validated['user_guid']) ? $validated['user_guid'] : auth()->user()->guid;

            $user = User::where ('guid', $user_guid)->first();

            if (! $user) {
                return $this->sendError ('USER_NOT_FOUND');
            } else {

                $files = new Files();

                // Check if the user has a profile picture
                $query = Meta::where ('user_id', $user->id)->where ('key', 'userpic')->first();
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
    }

    /**
     * Remove profile image
     */
    public function remove (Request $request) {

        // Validate the request...
        $rules = [
            'user_guid' => ['nullable', 'string'],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            $validated = $validator->validated();

            $user_guid = isset ($validated['user_guid']) ? $validated['user_guid'] : auth()->user()->guid;

            $user = User::where ('guid', $user_guid)->first();

            if (! $user) {
                return $this->sendError ('USER_NOT_FOUND');
            } else {

                // Check if the user has a profile picture
                $query = Meta::where ('user_id', $user->id)->where ('key', 'userpic')->first();
                $file_id = $query ? $query->value : null;

                if (isset ($file_id) && $file_id > 0) {
                    $this->deleteUserpicFile((int) $file_id);
                    // Remove the meta
                    Meta::where ('user_id', $user->id)->where ('key', 'userpic')->delete();

                    ActivityLog::record('user', "removed {$user->first_name} {$user->last_name} profile image", null, auth()->id());

                    return $this->sendResponse ('FILES_DELETED');
                }

                return $this->sendError ('FILE_NOT_FOUND');
            }
        }

    }

    /**
     * Delete a userpic's S3 object + files row. Uses the s3 disk directly rather
     * than Files::delete(), which unlinks from the default local disk instead
     * of the disk the file actually lives on (same fix as Firms::deleteLogoFile()).
     */
    private function deleteUserpicFile (int $fileId): void
    {
        $path = DB::table('files')->where('id', $fileId)->value('file_path');
        if ($path) {
            Storage::disk('s3')->delete($path);
        }
        (new Files())->unlink($fileId);
    }

}

