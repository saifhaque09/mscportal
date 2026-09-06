<?php

namespace App\Modules\Auth\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Validation\Rules;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Encryption\DecryptException;

use App\Modules\Settings\Controllers\Settings;
use App\Http\Controllers\BaseController;
use App\Http\Controllers\OTPController;
use App\Mail\SendOTP;
use App\Models\User;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Auth\Models\UserDevice;
use App\Modules\Notifications\Models\Notification;

use Validator;

class Login extends BaseController {

    /**
     * =================================================
     * LOGIN WITH EMAIL AND PASSWORD
     * =================================================
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     * ===============================================
     */
    public function login(Request $request) {

        $statuses = config ('users.status');

        $rules = [];

        $settingsClass = new Settings();
        $settings = $settingsClass->getSettings('login', 1);
        $login_field_is_required = isset($settings['login_field_is_required']) ? $settings['login_field_is_required'] : 'any';
        $two_factor_authentication = isset($settings['two_factor_authentication']) ? $settings['two_factor_authentication'] : 0;

        if ($login_field_is_required == 'any') {
            if (isset($settings['login_field_email_show']) && $settings['login_field_email_show'] == 1) {
                $rules['email'] = 'nullable|required_without:mobile|email';
            }
            if (isset($settings['login_field_mobile_show']) && $settings['login_field_mobile_show'] == 1) {
                $rules['mobile'] = 'nullable|required_without:email|numeric';
            }
        } else if ($login_field_is_required == 'both') {
            if (isset($settings['login_field_email_show']) && $settings['login_field_email_show'] == 1) {
                $rules['email'] = 'required|email';
            }
            if (isset($settings['login_field_mobile_show']) && $settings['login_field_mobile_show'] == 1) {
                $rules['mobile'] = 'required|numeric';
            }
        } else {
            $rules['email'] = 'required|email';
        }

        $rules['email'] = 'nullable|required_without:mobile|email'; // Overriding email rule from above //  
        $rules['password'] = 'required';
        $rules['remember'] = 'nullable|boolean';
        $rules['otp'] = 'nullable|numeric';

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            $this->ensureIsNotRateLimited($request);

            $validated = $validator->validated();
            $remember = isset ($validated['remember']) ? $validated['remember'] : false;
            $email = isset ($validated['email']) ? $validated['email'] : null;
            $mobile = isset ($validated['mobile']) ? $validated['mobile'] : null;
            $otp = isset ($validated['otp']) ? $validated['otp'] : null;

            // Find the user
            $user = User::where (function ($query) use ($login_field_is_required, $email, $mobile) {
                        if ($login_field_is_required == 'any') {
                            if ( ! is_null($email)) {
                                $query->where ('email', $email);
                            }
                            if ( ! is_null($mobile)) {
                                $query->orWhere ('mobile', $mobile);
                            }
                        } else if ($login_field_is_required == 'both') {
                            $query->where ('email', $email);
                            $query->where ('mobile', $mobile);
                        } else {
                            $query->where ('email', $email);
                        }
                    })->first ();
            // Check if user exists
            if ($user) {
                // Check the password
                if (Hash::check($validated['password'], $user->password)) {
                    // The user is valid
                    if ($user->status == $statuses['pending']) {
                        $message = [
                            'status' => [
                                'ACCOUNT_PENDING_FOR_APPROVAL',
                                'status:'.$user->status,
                            ],
                        ];
                        return $this->sendError ($message);
                    }
                    // Check if user is inactive
                    if ($user->status == $statuses['inactive']) {
                        $message = [
                            'status' => [
                                'ACCOUNT_BANNED',
                                'status:'.$user->status,
                            ],
                        ];
                        return $this->sendError ($message);
                    }

                    // Check if two factor authentication is enabled
                    if ($two_factor_authentication == true && is_null($otp)) {
                        // Generate and send OTP
                        $otpController = new OTPController();
                        $otp = $otpController->generateOTP($user->email);
                        $msg = [
                            'name' => $user->first_name,
                            'otp' => $otp,
                            'validity' => '30 minutes',
                            'context' => 'login',
                        ];
                        Mail::to($user->email)->send(new SendOTP($msg));
                        return $this->sendResponse ('OTP_SENT_FOR_2FA');
                    }

                    // If two factor authentication is enabled, validate the OTP
                    if ($two_factor_authentication == true && ! is_null($otp)) {
                        $otpController = new OTPController();
                        $is_valid_otp = $otpController->validateOTP ($user->email, $otp);
                        if ($is_valid_otp == null) {
                            RateLimiter::hit($this->throttleKey($request));
                            return $this->sendError ('INVALID_OTP_FOR_2FA');
                        }
                    }

                    // Begin the login process
                    Auth::login ($user, $remember);

                    $request->session()->regenerate();
                    $user->update([
                        'last_login_at' => now(),
                    ]);

                    $token = $user->createToken($user->first_name)->plainTextToken;

                    /**
                     * Get user with roles and permissions
                     */
                    $user = User::with (['roles' => function ($query) {
                                $query->with (['links' => function ($query) {
                                    $query->whereNull ('parent_id');
                                    $query->with ('children');
                                    $query->orderBy ('menu_order', 'ASC');
                                }]);
                            }, 
                            'business'])->find ($user->id);

                    RateLimiter::clear($this->throttleKey($request));

                    $this->notifyIfNewDevice($user, $request);

                    ActivityLog::recordRoleAction('login', $user, 'Login');

                    // meta is `encrypted:array` — a row encrypted under a
                    // different/rotated APP_KEY throws DecryptException when
                    // the response serializes $user, which would otherwise
                    // block this user from logging in entirely.
                    try {
                        $user->meta;
                    } catch (DecryptException $e) {
                        Log::warning('Undecryptable user meta', ['user_id' => $user->id, 'error' => $e->getMessage()]);
                        $user->setRawAttributes(array_merge($user->getAttributes(), ['meta' => null]));
                    }

                    return response()->json([
                        'success' => true,
                        'access_token' => $token,
                        'token_type' => 'Bearer',
                        'user'  => $user,
                        'csrf_token' => csrf_token(),
                    ]);

                } else {
                    RateLimiter::hit($this->throttleKey($request));
                    return $this->sendError ('INVALID_CREDENTIALS');
                }
            } else {
                RateLimiter::hit($this->throttleKey($request));
                return $this->sendError ('INVALID_CREDENTIALS');
            }
        }
    }

    /**
     * =================================================
     * LOGIN WITH EMAIL AND OTP
     * =================================================
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     * ===============================================
     * Step 1
     * Validate email or mobile and send otp
     * 
     * Step 2
     * Validate email/mobile and otp
     * Send otp hash
     * 
     * Step 3
     * Login with otp hash
     * ===============================================
     */

    /**
     * Step 1
     * Validate email
     * =================================================
     */
    public function validate_email (Request $request) {

        $rules = [
            'email' => ['required', 'string', 'email', 'max:255', 'exists:'.User::class],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Throttle OTP requests themselves (not just guesses) — otherwise
            // this endpoint can be used to mail-bomb a target's inbox.
            $this->ensureOtpActionIsNotRateLimited($request, 'otp-request', 5);
            RateLimiter::hit($this->otpThrottleKey($request, 'otp-request'), 3600);

            $validated = $validator->validated();

            $otpController = new OTPController();
            $otp = $otpController->generateOTP($validated['email']);

            $msg = [
                'name' => 'User',
                'otp' => $otp,
                'validity' => '30 minutes',
                'context' => 'login',
            ];
            Mail::to($validated['email'])->send(new SendOTP($msg));

            return $this->sendResponse ('OTP_SENT');
        }
    }

    /**
     * Step 1
     * Validate mobile
     * =================================================
     */
    public function validate_mobile (Request $request) {

        $rules = [
            'mobile' => ['required', 'string', 'max:255'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Same OTP-request throttle as validate_email() above.
            $this->ensureOtpActionIsNotRateLimited($request, 'otp-request', 5);
            RateLimiter::hit($this->otpThrottleKey($request, 'otp-request'), 3600);

            $validated = $validator->validated();

            $otpController = new OTPController();
            $otp = $otpController->generateOTP($validated['mobile']);

            $msg = [
                'name' => 'User',
                'otp' => $otp,
            ];
            $otpController->sendMobileOTP ($validated['mobile'], $msg);

            return $this->sendResponse ('OTP_SENT');
        }
    }

    /**
     * Step 2
     * Validate email and otp
     * =================================================
     */
    public function validate_otp (Request $request) {

        $settingsClass = new Settings();
        $settings = $settingsClass->getSettings('login', 1);
        $login_field_is_required = isset($settings['login_field_is_required']) ? $settings['login_field_is_required'] : 'any';

        $rules = [];

        if ($login_field_is_required == 'any') {
            if (isset($settings['login_field_email_show']) && $settings['login_field_email_show'] == 1) {
                $rules['email'] = 'nullable|required_without:mobile|email|exists:'.User::class;
            }
            if (isset($settings['login_field_mobile_show']) && $settings['login_field_mobile_show'] == 1) {
                $rules['mobile'] = 'nullable|required_without:email|numeric';
            }
        } else if ($login_field_is_required == 'both') {
            if (isset($settings['login_field_email_show']) && $settings['login_field_email_show'] == 1) {
                $rules['email'] = 'required|email|exists:'.User::class;
            }
            if (isset($settings['login_field_mobile_show']) && $settings['login_field_mobile_show'] == 1) {
                $rules['mobile'] = 'required|numeric';
            }
        }

        $rules['email_otp'] = ['required_with:email'];
        $rules['mobile_otp'] = ['required_with:mobile'];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // This is the endpoint that actually guesses the 6-digit OTP —
            // the classic brute-force target. Cap attempts before checking.
            $this->ensureOtpActionIsNotRateLimited($request, 'otp-validate', 5);

            // Retrieve the validated input...
            $validated = $validator->validated();

            $otpController = new OTPController();

            $otp_hash = [];
            $email_otp_hash = 0;
            $mobile_otp_hash = 0;

            if (isset ($validated['email'])) {
                $email_otp_hash = $otpController->validateOTP ($validated['email'], $validated['email_otp']);
                $otp_hash['email_otp_hash'] = $email_otp_hash;
            }

            if (isset ($validated['mobile'])) {
                $mobile_otp_hash = $otpController->validateOTP ($validated['mobile'], $validated['mobile_otp']);
                $otp_hash['mobile_otp_hash'] = $mobile_otp_hash;
            }

            if (isset ($validated['email']) && $email_otp_hash == null) {
                RateLimiter::hit($this->otpThrottleKey($request, 'otp-validate'), 900);
                return $this->sendError ('INVALID_EMAIL_OTP');
            }

            if (isset ($validated['mobile']) && $mobile_otp_hash == null) {
                RateLimiter::hit($this->otpThrottleKey($request, 'otp-validate'), 900);
                return $this->sendError ('INVALID_MOBILE_OTP');
            }

            RateLimiter::clear($this->otpThrottleKey($request, 'otp-validate'));

            return $this->sendResponse ('OTP_VALIDATED', $otp_hash);
        }
    }


    /**
     * Step 3
     * Login with otp
     * =================================================
     */
    public function login_with_otp(Request $request) {

        $statuses = config ('users.status');

        $rules = [];

        $settingsClass = new Settings();
        $settings = $settingsClass->getSettings('login', 1);
        $login_field_is_required = isset($settings['login_field_is_required']) ? $settings['login_field_is_required'] : 'any';

        if ($login_field_is_required == 'any') {
            if (isset($settings['login_field_email_show']) && $settings['login_field_email_show'] == 1) {
                $rules['email'] = 'nullable|required_without:mobile|email';
                $rules['email_hash'] = 'required_with:email|string';
            }
            if (isset($settings['login_field_mobile_show']) && $settings['login_field_mobile_show'] == 1) {
                $rules['mobile'] = 'nullable|required_without:email|numeric';
                $rules['mobile_hash'] = 'required_with:mobile|string';
            }
        } else if ($login_field_is_required == 'both') {
            if (isset($settings['login_field_email_show']) && $settings['login_field_email_show'] == 1) {
                $rules['email'] = 'required|email';
                $rules['email_hash'] = 'required_with:email|string';
            }
            if (isset($settings['login_field_mobile_show']) && $settings['login_field_mobile_show'] == 1) {
                $rules['mobile'] = 'required|numeric';
                $rules['mobile_hash'] = 'required_with:mobile|string';
            }
        }

        $rules['remember'] = 'nullable|boolean';

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            $this->ensureIsNotRateLimited($request);

            $validated = $validator->validated();
            $remember = isset ($validated['remember']) ? $validated['remember'] : false;

            $email_otp_hash = null;
            $mobile_otp_hash = null;

            $otpController = new OTPController();
            if (isset ($validated['email']) && isset ($validated['email_hash'])) {
                $email_otp_hash = $otpController->validateOTPHash ($validated['email'], $validated['email_hash']);
            }
            if (isset ($validated['mobile']) && isset ($validated['mobile_hash'])) {
                $mobile_otp_hash = $otpController->validateOTPHash ($validated['mobile'], $validated['mobile_hash']);
            }

            if (isset ($validated['email_hash']) && $email_otp_hash == false) {
                RateLimiter::hit($this->throttleKey($request));
                return $this->sendError ('INVALID_EMAIL_HASH');
            }

            if (isset ($validated['mobile_hash']) && $mobile_otp_hash == false) {
                RateLimiter::hit($this->throttleKey($request));
                return $this->sendError ('INVALID_MOBILE_HASH');
            }

            // Find the user
            $user = User::with([
                    'roles' => function ($query) {
                        $query->with (['links' => function ($query) {
                            $query->whereNull ('parent_id');
                            $query->with ('children');
                            $query->orderBy ('menu_order', 'ASC');
                        }]);
                    }])
                    ->where (function ($query) use ($login_field_is_required, $validated) {
                        if ($login_field_is_required == 'any') {
                            if (isset ($validated['email'])) {
                                $query->where ('email', $validated['email']);
                            } else if (isset ($validated['mobile'])) {
                                $query->where ('mobile', $validated['mobile']);
                            }
                        } else if ($login_field_is_required == 'both') {
                            $query->where ('email', $validated['email']);
                            $query->where ('mobile', $validated['mobile']);
                        }
                    })
                    ->first ();

            if ($user) {
                // The user is valid
                if ($user->status == $statuses['pending']) {
                    return $this->sendError ('ACCOUNT_PENDING_FOR_APPROVAL');
                }
                if ($user->status == $statuses['inactive']) {
                    return $this->sendError ('ACCOUNT_BANNED');
                }

                // Begin the login process
                Auth::login ($user, $remember);

                $request->session()->regenerate();

                $token = $user->createToken($user->first_name)->plainTextToken;

                RateLimiter::clear($this->throttleKey($request));

                $this->notifyIfNewDevice($user, $request);

                ActivityLog::recordRoleAction('login', $user, 'Login');

                // See login()'s equivalent guard above — a row encrypted
                // under a different/rotated APP_KEY must not block login.
                try {
                    $user->meta;
                } catch (DecryptException $e) {
                    Log::warning('Undecryptable user meta', ['user_id' => $user->id, 'error' => $e->getMessage()]);
                    $user->setRawAttributes(array_merge($user->getAttributes(), ['meta' => null]));
                }

                return response()->json([
                    'success' => true,
                    'access_token' => $token,
                    'token_type' => 'Bearer',
                    'user'  => $user,
                    'csrf_token' => csrf_token(),
                ]);

            } else {
                RateLimiter::hit($this->throttleKey($request));
                return $this->sendError ('INVALID_CREDENTIALS');
            }
        }
    }

    /**
     * =================================================
     *
     */

    /**
     * =================================================
     * Get token for authenticated user
     * =================================================
     * @return \Illuminate\Http\JsonResponse
     * ===============================================
     */
    public function getToken () {

        if (Auth::check()) {
            // Retrieve the currently authenticated user's ID...
            $id = Auth::id();

            $user = User::with (['roles' => function ($query) {
                $query->with (['links' => function ($query) {
                    $query->whereNull ('parent_id');
                    $query->with ('children');
                    $query->orderBy ('menu_order', 'ASC');
                }]);
            }, 'business'])->where ('id', $id)->first ();

            if ($user) {
                return $this->sendResponse ('USER_FOUND', $user);
            } else {
                return $this->sendError ('USER_NOT_FOUND');
            }
        } else {
            return $this->sendError ('USER_NOT_LOGGED_IN');
        }
    }


    /**
     * Ensure the login request is not rate limited.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function ensureIsNotRateLimited($request): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey($request), 5)) {
            return;
        }

        event(new Lockout($request));

        $seconds = RateLimiter::availableIn($this->throttleKey($request));

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey($request): string
    {
        return Str::transliterate(Str::lower($request->input('email')).'|'.$request->ip());
    }

    /**
     * Rate-limit key for OTP request/validation endpoints. Kept separate from
     * throttleKey() above (own $action prefix) so OTP throttling never shares
     * a bucket with login throttling, and keyed on whichever identifier
     * (email or mobile) the request supplies, since these endpoints run
     * before any session/user is established.
     */
    private function otpThrottleKey (Request $request, string $action): string
    {
        $identifier = $request->input('email') ?: $request->input('mobile');
        return $action . '|' . Str::transliterate(Str::lower((string) $identifier)) . '|' . $request->ip();
    }

    /**
     * Throttle guard for OTP request/validation endpoints, mirroring
     * ensureIsNotRateLimited() above but with a caller-supplied action/limits
     * so each endpoint (send vs. guess) can have its own cap.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    private function ensureOtpActionIsNotRateLimited (Request $request, string $action, int $maxAttempts): void
    {
        $key = $this->otpThrottleKey($request, $action);

        if (! RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            return;
        }

        $seconds = RateLimiter::availableIn($key);

        throw ValidationException::withMessages([
            'otp' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Record this login's device (user-agent + IP fingerprint) and notify the user
     * if it doesn't match any device they've logged in from before. No notification
     * on a user's very first-ever login — there's no "usual" device yet to differ from.
     */
    private function notifyIfNewDevice(User $user, Request $request): void
    {
        $deviceHash = hash('sha256', $request->userAgent().'|'.$request->ip());

        $hadKnownDevice = UserDevice::where('user_id', $user->id)->exists();

        $device = UserDevice::firstOrNew([
            'user_id'     => $user->id,
            'device_hash' => $deviceHash,
        ]);
        $isNewDevice = ! $device->exists;

        $device->user_agent   = $request->userAgent();
        $device->ip_address   = $request->ip();
        $device->last_seen_at = now();
        $device->save();

        if ($hadKnownDevice && $isNewDevice) {
            Notification::record(
                $user->id,
                'New device login',
                "A new login to your account was detected from {$request->ip()} using {$request->userAgent()}.",
                'new_device_login'
            );
        }
    }

    /**
     * =================================================
     * Logout user
     * =================================================
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     * ===============================================
     */
    public function logout (Request $request) {
        $user = Auth::user();

        // Revoke all tokens...
        $user->tokens()->delete();

        Auth::guard('web')->logout(); // Specify the web guard

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        ActivityLog::recordRoleAction('logout', $user, 'Logout');

        return $this->sendResponse ('USER_LOGGED_OUT');
    }

    /**
     * =================================================
     * Logout user from other devices
     * =================================================
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     * ===============================================
     * 
     */
    public function logout_other_devices (Request $request) {

        $rules = [
            'current_password' => ['required', 'string'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        }

        $validated = $validator->validated();
        $currentPassword = $validated['current_password'];

        $user = Auth::user();
        if (Hash::check($currentPassword, $user->password)) {
            // Revoke all tokens...
            Auth::guard('web')->logoutOtherDevices($currentPassword);

            ActivityLog::record('logout', 'logout', null, $user->id);

            return $this->sendResponse ('USER_LOGGED_OUT_OTHER_DEVICES');
        }

        return $this->sendError ('INVALID_CURRENT_PASSWORD');

    }
}
