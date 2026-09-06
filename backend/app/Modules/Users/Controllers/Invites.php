<?php

namespace App\Modules\Users\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Config;
use Illuminate\Validation\Rules\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Validator;

use App\Models\User;
use App\Mail\InviteUser;
use App\Modules\Clients\Models\Invite;
use App\Modules\Clients\Models\Firm;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Http\Controllers\BaseController;
class Invites extends BaseController {

    /**
     * List all invites
     */
    public function getAll (Request $request, string $guid=NULL ) {

        
        
        $firm_id = NULL;
        if (isset ($guid)) {
            if ($guid == 'individual') {
                $roles = ['Taxfiler'];
            } else {
                $firm = Firm::where('guid', $guid)->first();
                if (! $firm) {
                    return $this->sendError ('BUSINESS_NOT_FOUND');
                }
                if (! $this->authorizeFirmScope($firm->id, 'invites.view', 'access_business_account')) {
                    return $this->sendError('UNAUTHORIZED', 403);
                }
                $firm_id = $firm->id;
                $roles = ['Client', 'Employee'];
            }
        } else {
            $roles = ['Accountant', 'Staff'];
        }

        $filters = Config::get('users.filters');

        $search = "";
        $order_by = Config::get('users.order_by');

        $rules = [
			'search' => ['nullable', 'string'],
			'role' => ['nullable', 'string', Rule::in($roles)],
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
            $roles = isset($validated['role']) ? $validated['role'] : $roles;

            $sql = Invite::whereAny(['email', 'mobile', 'first_name', 'last_name'], 'like', "%$search%");
            if ($firm_id) {
                $sql = $sql->where('firm_id', $firm_id);
            }
            if (is_array ($roles) && ! empty ($roles)) {
                $sql = $sql->whereIn ('role', $roles);
            } else {
                $sql = $sql->where ('role', $roles);
            }

            // Paginated
            $total_results = $sql->count();
            $max = ceil($total_results / $results_per_page);
            for ($i=1; $i<=$max; $i++) {
                if ($i == $page) {
                    $offset = ($i-1) * $results_per_page;
                }
            }

            $records = $sql->orderBy('created_at', 'DESC')
                        ->limit($results_per_page)
                        ->offset($offset)
                        ->get();

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
	public function details (Request $request ) {

        // Validate the request...
        $rules = [
			'hash' => ['required', 'string'],
		];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();
            $hash = isset ($validated['hash']) ? $validated['hash'] : "1";
            $record = Invite::where('hash', $hash)->first ();
            if ( $record ) {
                $firm = Firm::find($record->firm_id);
                if ($firm) {
                    $record->firm_name = $firm->firm_name;
                }
                return $this->sendResponse ('RECORDS_FOUND', $record);
            } else {
                return $this->sendError ('RECORDS_NOT_FOUND', 200);
            }
        }
    }

    
    /**
     * Send new invite
     */
    public function send (Request $request, string $guid=NULL) {

        $firm_id = NULL;
        if (isset ($guid)) {
            $firm = Firm::where('guid', $guid)->first();
            if (! $firm) {
                return $this->sendError ('BUSINESS_NOT_FOUND');
            }
            if (! $this->authorizeFirmScope($firm->id, 'invites.send', 'access_business_account')) {
                return $this->sendError('UNAUTHORIZED', 403);
            }
            $firm_id = $firm->id;
            $roles = ['Client', 'Employee', 'Taxfiler'];
            $role = 'Client';
        } else {
            $roles = ['Accountant', 'Staff', 'Taxfiler'];
            $role = 'Accountant';
        }

        $rules = [
			'invite' => ['required', 'array'],
			'invite.*.email' => ['required', 'email' ],
			'invite.*.mobile' => ['nullable', 'integer'],
			'invite.*.first_name' => ['required', 'string'],
			'invite.*.last_name' => ['nullable', 'string'],
			'invite.*.role' => ['nullable', Rule::in ($roles)],
            'invite.*.sin_number' => ['nullable', 'numeric'],
            'invite.*.address' => ['nullable', 'string', 'max:255'],
            'invite.*.country' => ['nullable', 'string', 'max:100'],
            'invite.*.country_code' => ['nullable', 'string', 'max:10'],
            'invite.*.province' => ['nullable', 'string', 'max:100'],
            'invite.*.dob' => ['nullable', 'date', 'date_format:Y-m-d',],
            'invite.*.marital' => ['nullable', 'array',],
            'invite.*.marital.status' => ['nullable', 'in:married,unmarried,divorced,widowed',],
            'invite.*.marital.anniversary' => ['nullable', 'date', 'invite.*.date_format:Y-m-d',],
            'invite.*.marital.spouse_name' => ['nullable', 'string', 'max:255',],
            'invite.*.marital.spouse_dob' => ['nullable', 'date', 'date_format:Y-m-d',],
            'invite.*.marital.spouse_sin_number' => ['nullable', 'numeric',],
            'invite.*.marital.spouse_status' => ['nullable', 'in:live-in,married',],
            'invite.*.bank_details.*' => ['nullable', 'array',],
            'invite.*.bank_details.*.account_holder_name' => ['nullable', 'string', 'max:255'],
            'invite.*.bank_details.*.account_number' => ['nullable', 'string', 'max:50'], 
            'invite.*.bank_details.*.bank_name' => ['nullable', 'string', 'max:255'],
            'invite.*.bank_details.*.bank_code' => ['nullable', 'string', 'max:50'],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();
            $i = 0;
            $invites = $validated['invite'];
            $payload = [];
            $already_registered = [];
            $not_authorized = [];

            if (!empty ($invites)) {
                foreach ($invites as $invite) {

                    $first_name = isset ($invite['first_name']) ? $invite['first_name'] : NULL;
                    $last_name = isset ($invite['last_name']) ? $invite['last_name'] : NULL;
                    $role = isset ($invite['role']) ? $invite['role'] : $role;
                    $mobile = isset ($invite['mobile']) ? $invite['mobile'] : NULL;
                    $hash = Str::random(64);

                    // The no-guid path is shared by both platform staff invites
                    // (users/invites/send) and individual taxfiler invites
                    // (individual/business/invites/send) — only Admin may grow
                    // the Accountant/Staff roster; Taxfiler invites are unaffected.
                    if ($firm_id === NULL && in_array ($role, ['Accountant', 'Staff']) && ! auth()->user()->hasRole('Admin')) {
                        $not_authorized[] = $invite['email'];
                        continue;
                    }

                    $meta = [
                        'alternate_mobile' => isset($invite['alternate_mobile']) ? $invite['alternate_mobile'] : NULL,
                        'alternate_email' => isset($invite['alternate_email']) ? $invite['alternate_email'] : NULL,
                        'country' => isset($invite['country']) ? $invite['country'] : NULL,
                        'country_code' => isset($invite['country_code']) ? $invite['country_code'] : NULL,
                        'province' => isset($invite['province']) ? $invite['province'] : NULL,
                        'time_zone' => isset($invite['time_zone']) ? $invite['time_zone'] : NULL,
                        'sin_number' => isset($invite['sin_number']) ? $invite['sin_number'] : NULL,
                        'dob' => isset($invite['dob']) ? $invite['dob'] : NULL,
                        'marital' => isset($invite['marital']) ? $invite['marital'] : NULL,
                        'address' => isset($invite['address']) ? $invite['address'] : NULL,
                        'bank_details' => isset($invite['bank_details']) ? $invite['bank_details'] : NULL,
                    ];

                    // Check if the email already belongs to an active account
                    $user = User::where('email', $invite['email'])->first();

                    if ($user) {
                        $already_registered[] = $invite['email'];
                        continue;
                    }

                    // Create or refresh invite record with a new hash. The actual
                    // user account is only created once the invitee accepts it
                    // (see Passwords::create_password()) — until then, this row
                    // (plus the meta update below) is the sole record of the invite.
                    $data = [
                        'firm_id' => $firm_id,
                        'created_by' => auth()->id(),
                        'email' => $invite['email'],
                        'mobile' => $mobile,
                        'first_name' => $first_name,
                        'last_name' => $last_name,
                        'role' => $role,
                        'hash' => $hash,
                        'expires_at' => now()->addDays(1),
                    ];

                    Invite::upsert ($data, ['email'], ['firm_id', 'created_by', 'mobile', 'first_name', 'last_name', 'role', 'hash', 'expires_at']);

                    // Bulk Builder::update() bypasses casts/mutators, so re-fetch as a
                    // model instance to make sure the encrypted:array cast on meta
                    // actually runs.
                    Invite::where('email', $invite['email'])->first()->update(['meta' => $meta]);

                    // Send email
                    $msg = [
                        'name' => implode (' ', [$first_name, $last_name]),
                        'email' => $invite['email'],
                        'role' => $role,
                        'join_link' => config('app.frontend_url') . '/createpassword?hash='.$hash,
                    ];
                    try {
                        Mail::to($invite['email'])->send(new InviteUser($msg));
                    } catch (\Exception $e) {
                        Log::error('InviteUser mail failed', [
                            'email' => $invite['email'],
                            'error' => $e->getMessage(),
                        ]);
                    }
                    ActivityLog::record('Invite', "Invite {$role}", null, auth()->id());

                    $payload[] = $msg;
                    $i++;
                }

                if ($i > 0) {
                    return $this->sendResponse ('INVITES_SENT', [
                        'num_invites_sent'    => $i,
                        'invites'             => $payload,
                        'already_registered'  => $already_registered,
                        'not_authorized'      => $not_authorized,
                    ]);
                }

                if (! empty($already_registered)) {
                    return $this->sendError ([
                        'message'            => 'EMAIL_ALREADY_REGISTERED',
                        'already_registered' => $already_registered,
                    ], 200);
                }

                if (! empty($not_authorized)) {
                    return $this->sendError ([
                        'message'        => 'NOT_AUTHORIZED_FOR_ROLE',
                        'not_authorized' => $not_authorized,
                    ], 403);
                }

                return $this->sendError ('NO_INVITES_SENT');

            } else {
                return $this->sendError ('INVITES_NOT_SENT');
            }
        }
    }


    /**
     * Resend invite
     */
    public function resend (Request $request ) {

        $rules = [
			'email' => ['required', 'list'],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
            // Retrieve the validated input...
            $validated = $validator->validated();

            $emails = $validated['email'];
            if (! empty ($emails)) {
                $invites = Invite::whereIn ('email', $emails)->get ();

                foreach ($invites as $invite) {
                    if (! $this->authorizeInviteScope($invite)) {
                        return $this->sendError('UNAUTHORIZED', 403);
                    }
                }

                if ($invites) {
                    foreach ($invites as $invite) {
                        $msg = [
                            'name' => implode(' ', [$invite['first_name'], $invite['last_name']]),
                            'role' => $invite['role'],
                            'join_link' => config('app.frontend_url') . '/createpassword?hash='.$invite['hash'],
                        ];
                        Invite::where('email', $invite['email'])->update([
                            'expires_at' => now()->addDays(1),
                            'updated_at' => now(),
                        ]);
                        Mail::to($invite['email'])->send(new InviteUser($msg));
                    }
                }
                return $this->sendResponse ('INVITES_SENT');
            }
        }
    }


    // Delete invite (permanentaly)
	public function delete (Request $request) {

        // Validate the request...
        $rules = [
			'email' => ["required", "list"]
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
            // Retrieve the validated input...
            $validated = $validator->validated();

            $invites = Invite::whereIn('email', $validated['email'])->get();
            foreach ($invites as $invite) {
                if (! $this->authorizeInviteScope($invite)) {
                    return $this->sendError('UNAUTHORIZED', 403);
                }
            }

            $record = Invite::whereIn('email', $validated['email'])->delete ();
            if ($record) {
                return $this->sendResponse ('RECORDS_DELETED');
            } else {
                return $this->sendError ('RECORDS_NOT_FOUND', 200);
            }
        }
    }

    /**
     * Get pending invite counts (platform + business combined).
     * Admin sees the platform total; everyone else sees only invites they
     * personally sent (created_by), matching the "my dashboard" scoping
     * used for the other Accountant/Staff dashboard cards.
     */
    public function getCount (Request $request) {
        $scope = fn () => auth()->user()->hasRole('Admin')
            ? Invite::query()
            : Invite::where('created_by', auth()->id());

        $platform = $scope()->whereNull('firm_id')->count();
        $business  = $scope()->whereNotNull('firm_id')->count();

        return $this->sendResponse('RECORDS_FOUND', [
            'platform_invites' => $platform,
            'business_invites' => $business,
            'total'            => $platform + $business,
        ]);
    }

    /**
     * resend()/delete() operate on a raw list of emails with no firm_id in
     * the request, unlike every other invite endpoint — the route's flat
     * `invites.manage` permission (held platform-wide by Accountant/Staff)
     * was the only gate, letting either role resend/delete any firm's
     * invites. Authorize against each invite's own firm_id/role instead.
     * Platform invites (firm_id null) are a mix of Accountant/Staff invites
     * (Admin-only to send, per send()'s no-guid branch) and Taxfiler
     * invites (Accountant/Staff may send and therefore manage those too) —
     * branch on role the same way send() does.
     */
    private function authorizeInviteScope(Invite $invite): bool
    {
        $user = auth()->user();

        if ($user->hasRole('Admin')) {
            return true;
        }

        if ($invite->firm_id === null) {
            // Accountant/Staff invites: Admin-only, already excluded above.
            if (in_array($invite->role, ['Accountant', 'Staff'], true)) {
                return false;
            }

            // Taxfiler invites have no firm to scope against — deliberately
            // unscoped for any Accountant/Staff holding invites.manage, same
            // as the rest of the Taxfiler roster (see listTaxfilers()).
            // Staff stays write-blocked regardless, per this app's
            // Staff-is-read-only convention.
            return $user->can('invites.manage') && ! $user->hasRole('Staff');
        }

        return $this->authorizeFirmScope($invite->firm_id, 'invites.manage', 'access_business_account', blockStaffWrite: true);
    }
}
