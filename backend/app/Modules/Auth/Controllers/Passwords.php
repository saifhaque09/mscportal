<?php

namespace App\Modules\Auth\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules;
use Illuminate\Support\Facades\RateLimitr;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Validator;

use App\Http\Controllers\BaseController;
use App\Modules\Clients\Models\Invite;
use App\Mail\SendMail;
use App\Mail\SendOTP;
use App\Helpers\Guid;

use App\Models\User;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Notifications\Models\Notification;

  

class Passwords extends BaseController
{

    /**
     * Change user password
     */
    public function create_password (Request $request) {

        $rules = [
            'hash' => 'required|string',
            'password' => ['required', 'confirmed', Rules\Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();

            // Here we will attempt to reset the user's password. If it is successful we
            // will update the password on an actual user model and persist it to the
            // database. Otherwise we will parse the error and return the response.
            $invite = Invite::where ('hash', $validated['hash'])->whereNowOrFuture('expires_at')->first ();
            if (! $invite) {
                return $this->sendError ('INVALID_OR_EXPIRED_LINK');
            }

            $email = $invite['email'];

            // The invite is the sole record of this person until now — the
            // account is created for the first time here, on acceptance.
            $existing = User::where ('email', $email)->first ();
            if ($existing) {
                return $this->sendError ('USER_ALREADY_EXISTS');
            }

            $user = User::create([
                'firm_id' => $invite->firm_id,
                'guid' => Str::random(8),
                'email' => $email,
                'first_name' => $invite->first_name,
                'last_name' => $invite->last_name,
                'mobile' => $invite->mobile,
                'meta' => $invite->meta,
                'status' => 'active',
                'password' => Hash::make($request->string('password')),
            ]);
            $user->forceFill(['remember_token' => Str::random(60)])->save();

            $user->assignRole ($invite->role);

            // Generate a guid based on the primary key
            Guid::generate ('users', 'guid', $invite->first_name, $user->id);

            event(new PasswordReset($user));

            // Clear the invite record
            $invite->delete ();

            return $this->sendResponse ('PASSWORD_CREATED', $user);
        }
    }

    /**
     * Change user password
     */
    public function change_password (Request $request) {

        $rules = [
            'email' => 'required|email|exists:'.User::class,
            'token' => 'required|string',
            'password' => ['required', 'confirmed', Rules\Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();
           
            $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
                function ($user) use ($request) {
                    $user->forceFill([
                        'password' => Hash::make($request->string('password')),
                        'remember_token' => Str::random(60),
                    ])->save();

                    event(new PasswordReset($user));
                }
            );

            if ($status == Password::PASSWORD_RESET) {
                $user = User::where ('email', $request->email)->first ();

                ActivityLog::recordRoleAction('reset', $user, 'reset the password');

                Notification::record(
                    $user->id,
                    'Password reset',
                    'Your password has been reset.',
                    'password_reset'
                );

                return $this->sendResponse ($status);
            } else {
                //return $this->sendError ($status);
                return $this->sendError ("The password has already been reset. Please log in with your new credentials.");
            }
        }
    }

    /**
     * Send password reset link email
     * =================================================
     */
    public function send_reset_link_email (Request $request) {

        $rules = [
            'email' => ['required', 'string', 'email', 'max:255', 'exists:'.User::class ],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();

            $status = Password::sendResetLink(
                $request->only('email')
            );

            if ($status == Password::RESET_LINK_SENT) {
                return $this->sendResponse ($status );
            } else {
                //return $this->sendError ($status);
                if ($status === Password::RESET_THROTTLED) {
                return response()->json([
        'success' => false,
        'message' => 'You already requested a reset link. Please try again later.'
    ], 429);
                }
                if ($status === Password::INVALID_USER) {
                return $this->sendError('Email not found in our system.');
                }
                return $this->sendError('Something went wrong.');
            }
        }
    }

    public function validatePasswordLink(Request $request)
{
    // Step 1: Validation
    $rules = [
        'email' => 'required|email|exists:'.User::class,
        'token' => 'required|string',
    ];

    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails()) {
        return $this->sendError($validator->errors());
    }

    try {
        // Step 2: Get reset record
        $record = DB::table('password_reset_tokens')
    ->where('email', $request->email)
    ->first();

        if (!$record) {
            return $this->sendError('Link already used or invalid');
        }

        // check token
        if (!Hash::check($request->token, $record->token)) {
            return $this->sendError('Invalid token');
        }

        // check expiry
        if (now()->diffInMinutes($record->created_at) > config('auth.passwords.users.expire')) {
            return $this->sendError('Link expired');
        }

        // Step 6: Success response
        return $this->sendResponse([
            'valid' => true,
            'email' => $request->email,
        ], 'Reset link is valid.');

    } catch (\Exception $e) {
        return $this->sendError('Something went wrong.', [$e->getMessage()]);
    }
}

}
