<?php

namespace App\Modules\Deadlines\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Carbon;
use Validator;
use App\Http\Controllers\BaseController;
use App\Modules\Clients\Models\Firm;
use App\Modules\Clients\Models\Invite;
use App\Models\User;
use App\Modules\Deadlines\Models\OrganizationDeadline;
use App\Modules\Notifications\Models\Notification;
use App\Modules\Settings\Models\Template;
use App\Modules\Organizations\Models\OrganizationUserAssignment;
use App\Services\OrganizationDeadlineService;

class OrganizationDeadlines extends BaseController
{
    public function __construct(private OrganizationDeadlineService $service) {}

    /**
     * Firm IDs the current user may see deadlines for. Null means "no
     * restriction" (Admin sees everything). Mirrors the three-tier scoping
     * authorizeFirmScope() uses for a single firm: Accountant/Staff scoped
     * to firms they hold an active access_business_account assignment on,
     * Client/Employee scoped to their own firm only.
     */
    private function accessibleFirmIds(): ?array
    {
        $user = auth()->user();

        if ($user->hasRole('Admin')) {
            return null;
        }

        if ($user->can('firms.manage')) {
            return OrganizationUserAssignment::where('user_id', $user->id)
                ->whereHas('organizationRole', function ($query) {
                    $query->where('status', 'active')
                        ->whereHas('permissions', function ($permQuery) {
                            $permQuery->where('code', 'access_business_account')->where('status', 'active');
                        });
                })
                ->pluck('firm_id')
                ->all();
        }

        return $user->firm_id ? [$user->firm_id] : [];
    }

    /**
     * GET /api/deadlines/reminders?type=tax|pd7a
     * Returns the organization's GST/HST or PD7A deadlines for the reminder
     * dashboard, scoped to firms the signed-in user may access.
     */
    public function reminders(Request $request)
    {
        $validated = Validator::make($request->query(), [
            'type' => ['required', 'string', 'in:tax,pd7a'],
        ]);
        if ($validated->fails()) {
            return $this->sendError($validated->errors());
        }

        $type = $validated->validated()['type'];
        $slug = $type === 'pd7a' ? 'payroll_tax_remittance_pd7a' : 'gst_hst_remittance';
        $firmIds = $this->accessibleFirmIds();

        $query = OrganizationDeadline::with([
            'organization:id,guid,firm_name,contact_email',
            'deadline:id,slug,name,type,description',
        ])->whereHas('deadline', fn ($q) => $q->where('slug', $slug))
          ->whereHas('organization');

        if ($firmIds !== null) {
            $query->whereIn('organization_id', $firmIds);
        }

        $rows = $query->orderBy('due_date')->get()->map(function ($row) {
            $firm = $row->organization;
            $client = User::where('firm_id', $firm->id)->role('Client')->orderBy('id')->first();
            $invite = $client ? null : Invite::where('firm_id', $firm->id)
                ->where('role', 'Client')->orderBy('id')->first();

            return [
                'id' => $row->id,
                'firm_id' => $firm->id,
                'firm_guid' => $firm->guid,
                'client_name' => $firm->firm_name,
                'client_email' => $client?->email ?? $invite?->email ?? $firm->contact_email,
                'deadline_name' => $row->deadline?->name,
                'deadline_slug' => $row->deadline?->slug,
                'due_date' => $row->due_date?->toDateString(),
                'deadline_status' => $row->status,
                'payment_status' => $row->payment_status ?: 'Pending',
                'payment_date' => $row->payment_date?->toDateString(),
            ];
        })->values();

        return $this->sendResponse('RECORDS_FOUND', $rows);
    }

    /** Update the payment status/date displayed on the reminder dashboard. */
    public function updateReminderPayment(Request $request, int $id)
    {
        $row = OrganizationDeadline::with('organization')->find($id);
        if (! $row || ! $row->organization) {
            return $this->sendError('DEADLINE_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmManageAction($row->organization_id, 'firms.manage', 'access_business_account')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $validator = Validator::make($request->all(), [
            'payment_status' => ['required', 'string', 'in:Pending,Paid'],
            'payment_date' => ['nullable', 'date_format:Y-m-d'],
        ]);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $row->payment_status = $request->input('payment_status');
        $row->payment_date = $request->input('payment_date');
        $row->save();

        return $this->sendResponse('REMINDER_PAYMENT_UPDATED', [
            'payment_status' => $row->payment_status,
            'payment_date' => $row->payment_date?->toDateString(),
        ]);
    }

    /** Send the configured reminder email and an in-app notification to a firm's client users. */
    public function sendReminder(int $id)
    {
        $row = OrganizationDeadline::with(['organization', 'deadline'])->find($id);
        if (! $row || ! $row->organization || ! $row->deadline) {
            return $this->sendError('DEADLINE_NOT_FOUND', 404);
        }
        if (! $this->authorizeFirmManageAction($row->organization_id, 'firms.manage', 'access_business_account')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $recipients = User::where('firm_id', $row->organization_id)->role('Client')->get();
        $emails = $recipients->pluck('email')->filter()->unique()->values();
        if ($emails->isEmpty()) {
            $emails = Invite::where('firm_id', $row->organization_id)
                ->where('role', 'Client')->pluck('email')->filter()->unique()->values();
        }
        if ($emails->isEmpty() && $row->organization->contact_email) {
            $emails = collect([$row->organization->contact_email]);
        }
        if ($emails->isEmpty()) {
            return $this->sendError('CLIENT_EMAIL_NOT_FOUND', 422);
        }

        $template = Template::where('slug', 'payment_reminder')->first();
        if (! $template) {
            return $this->sendError('PAYMENT_REMINDER_TEMPLATE_NOT_FOUND', 422);
        }

        $firmName = $row->organization->firm_name;
        $dueDate = $row->due_date?->toDateString() ?? '';
        $subject = strtr($template->subject, [
            '{{client_name}}' => $firmName,
            '{{$firm_name}}' => $firmName,
            '{{$due_date}}' => $dueDate,
            '{{$deadline_name}}' => $row->deadline->name,
        ]);
        $body = strtr($template->body ?? '', [
            '{{client_name}}' => e($firmName),
            '{{$firm_name}}' => e($firmName),
            '{{$due_date}}' => e($dueDate),
            '{{$deadline_name}}' => e($row->deadline->name),
        ]);

        try {
            foreach ($emails as $email) {
                Mail::html($body, fn ($message) => $message->to($email)->subject($subject));
            }
        } catch (\Throwable $exception) {
            report($exception);
            return $this->sendError('PAYMENT_REMINDER_EMAIL_FAILED', 500);
        }

        foreach ($recipients as $recipient) {
            Notification::record(
                $recipient->id,
                'Payment reminder',
                "A reminder was sent for {$row->deadline->name}, due {$dueDate}.",
                'payment_reminder',
                auth()->id()
            );
        }

        return $this->sendResponse('PAYMENT_REMINDER_SENT', ['recipient_count' => $emails->count()]);
    }

    /**
     * POST /api/deadlines/firms
     * One entry per deadline, strictly due_date ascending across every firm,
     * capped at each firm's 2 soonest deadlines. Entries are NOT grouped by
     * firm — a firm with 2 visible deadlines appears as two separate entries,
     * wherever those dates fall — so the Due Date column reads chronologically
     * end to end.
     *
     * The response keys are deliberately identical to the old firm-grouped
     * version (same `meta` keys, same firm fields, same nested `deadlines`
     * array) so the frontend's existing data[].deadlines[] flattening keeps
     * working untouched. The only difference is that each entry now carries
     * exactly one deadline instead of up to two.
     */
    public function firms(Request $request)
    {
        $filters = Config::get('deadlines.filters');

        $rules = [
            'search'           => ['nullable', 'string'],
            'type'             => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated        = $validator->validated();
        $results_per_page = $validated['results_per_page'] ?? $filters['results_per_page'];
        $page             = $validated['page']             ?? $filters['page'];
        // `??` falls through on null only, so an empty search box ("search":"")
        // used to swallow the selected `type` and return the whole unfiltered
        // list. Trim both and treat "" as absent, and keep them as two
        // independent filters that combine (search AND type) rather than one
        // shadowing the other.
        $search = trim((string) ($validated['search'] ?? ''));
        $type   = trim((string) ($validated['type']   ?? ''));

        // Every deadline row the caller may see, before the 2-per-firm cap.
        // whereHas('organization') applies the Firm soft-delete scope, so
        // deadlines belonging to a deleted firm drop out.
        $rowQuery = OrganizationDeadline::whereHas('organization');

        $firmIds = $this->accessibleFirmIds();
        if ($firmIds !== null) {
            $rowQuery->whereIn('organization_id', $firmIds);
        }

        // A firm matched by its own firm_name keeps all of its deadlines
        // (they are what that firm "is"); a firm matched only by a deadline
        // name contributes just the matching deadline(s).
        if ($search !== '') {
            $rowQuery->where(function ($q) use ($search) {
                $q->whereRelation('deadline', 'name', 'like', "%$search%")
                    ->orWhereHas('organization', fn ($oq) => $oq->where('firm_name', 'like', "%$search%"));
            });
        }

        // The deadline-type dropdown sends one exact option value. Match it
        // exactly against name/slug/type — a `like %...%` on the name would
        // make "Next Payroll Due" also select "Next Payroll Due (Weekly)",
        // "(Monthly)" and every other variant.
        if ($type !== '') {
            $rowQuery->whereHas('deadline', function ($q) use ($type) {
                $q->where(fn ($sub) => $sub->where('name', $type)
                    ->orWhere('slug', $type)
                    ->orWhere('type', $type));
            });
        }

        // The 2-per-firm cap, applied in SQL so pagination counts only the
        // rows that are actually displayable. ROW_NUMBER partitions by firm
        // and ranks by due_date, so rn <= 2 is each firm's 2 soonest.
        $ranked = (clone $rowQuery)
            ->select('id')
            ->selectRaw('ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY due_date ASC, id ASC) AS rn');

        $displayableIds = DB::query()->select('id')->fromSub($ranked, 'ranked')->where('rn', '<=', 2);

        $paginated = OrganizationDeadline::with([
                'organization:id,guid,firm_name,contact_email',
                'deadline:id,slug,name,type,description',
            ])
            ->whereIn('id', $displayableIds)
            ->orderBy('due_date')
            ->orderBy('id')
            ->paginate((int) $results_per_page, ['*'], 'page', (int) $page);

        // Per-firm totals drive the "+N more deadlines" link. Only the firms
        // present on this page need counting — the uncapped count, since
        // "more" means "hidden by the cap".
        $pageFirmIds = collect($paginated->items())->pluck('organization_id')->unique()->all();
        $firmTotals  = (clone $rowQuery)
            ->whereIn('organization_id', $pageFirmIds)
            ->selectRaw('organization_id, COUNT(*) as cnt')
            ->groupBy('organization_id')
            ->pluck('cnt', 'organization_id');

        // The organisation's client email, same two sources and same
        // precedence as clients/business/all: contact_email is no longer
        // collected on create/edit, so the client email comes from the invite
        // flow and sits on the pending invite until it's accepted, then on the
        // registered Client user (Passwords::create_password() deletes the
        // invite on acceptance). Batched for the page — this adds 2 queries
        // total, not 2 per row. pluck() keeps the last row for a duplicate
        // key, so order descending to let the lowest id win.
        $clientUserEmails   = User::whereIn('firm_id', $pageFirmIds)->role('Client')
                                ->orderByDesc('id')->pluck('email', 'firm_id');
        $clientInviteEmails = Invite::whereIn('firm_id', $pageFirmIds)->where('role', 'Client')
                                ->orderByDesc('id')->pluck('email', 'firm_id');

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to avoid
        // showing a spurious "failed to fetch" notification.
        $data = collect($paginated->items())->map(function ($od) use ($firmTotals, $clientUserEmails, $clientInviteEmails) {
            $totalDeadlines = (int) ($firmTotals[$od->organization_id] ?? 0);

            return [
                'id'                 => $od->organization?->id,
                'guid'               => $od->organization?->guid,
                'firm_name'          => $od->organization?->firm_name,
                'contact_email'      => $od->organization?->contact_email,
                // A registered client wins over a still-pending invite; null
                // when the organisation has no client yet — the key is always
                // present so the frontend can bind to it unconditionally.
                'client_email'       => $clientUserEmails[$od->organization_id]
                                        ?? $clientInviteEmails[$od->organization_id]
                                        ?? null,
                'total_deadlines'    => $totalDeadlines,
                'more_deadlines'     => max(0, $totalDeadlines - 2),
                'deadlines'          => [[
                    'id'       => $od->id,
                    'due_date' => $od->due_date?->toDateString(),
                    'status'   => $od->status,
                    'notes'    => $od->notes,
                    'deadline' => [
                        'id'          => $od->deadline?->id,
                        'slug'        => $od->deadline?->slug,
                        'name'        => $od->deadline?->name,
                        'type'        => $od->deadline?->type,
                        'description' => $od->deadline?->description,
                    ],
                ]],
            ];
        })->values();

        return $this->sendResponse('RECORDS_FOUND', [
            'meta' => [
                'first_page'           => 1,
                'last_page'            => $paginated->lastPage(),
                'current_page'         => $paginated->currentPage(),
                'num_results'          => $data->sum(fn ($firm) => count($firm['deadlines'])),
                'total_results'        => $paginated->total(),
                'total_organizations'  => (clone $rowQuery)->distinct()->count('organization_id'),
            ],
            'data' => $data,
        ]);
    }

    /**
     * GET /api/deadlines/all
     * List all organization deadlines across all firms.
     */
    public function index(Request $request)
    {
        $filters = Config::get('deadlines.filters');

        $rules = [
            'search'           => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
            'status'           => ['nullable', 'string', 'in:pending,completed,overdue'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated        = $validator->validated();
        $results_per_page = $validated['results_per_page'] ?? $filters['results_per_page'];
        $page             = $validated['page']             ?? $filters['page'];
        $search           = $validated['search']           ?? '';
        $status           = $validated['status']           ?? null;

        $query = OrganizationDeadline::with([
            'organization:id,guid,firm_name',
            'deadline:id,slug,name,type,description',
        ])->orderBy('due_date');

        $firmIds = $this->accessibleFirmIds();
        if ($firmIds !== null) {
            $query->whereIn('organization_id', $firmIds);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('organization', fn ($oq) =>
                    $oq->where('firm_name', 'like', "%$search%")
                )->orWhereHas('deadline', fn ($dq) =>
                    $dq->whereAny(['name', 'slug', 'type'], 'like', "%$search%")
                );
            });
        }

        $paginated = $query->paginate((int) $results_per_page, ['*'], 'page', (int) $page);

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to avoid
        // showing a spurious "failed to fetch" notification.
        return $this->sendResponse('RECORDS_FOUND', [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $paginated->lastPage(),
                'current_page'  => $paginated->currentPage(),
                'num_results'   => $paginated->count(),
                'total_results' => $paginated->total(),
            ],
            'data' => $paginated->items(),
        ]);
    }

    /**
     * GET /api/deadlines/organizations/{guid}
     * List deadlines for a single organization.
     */
    public function byOrganization(Request $request, string $guid)
    {
        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND', 200);
        }
        if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'access_business_account')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $filters = Config::get('deadlines.filters');

        $rules = [
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
            'status'           => ['nullable', 'string', 'in:pending,completed,overdue'],
            'year'             => ['nullable', 'required_with:month', 'integer', 'digits:4', 'min:2000', 'max:2100'],
            'month'            => ['nullable', 'required_with:year', 'integer', 'min:1', 'max:12'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated        = $validator->validated();
        $results_per_page = $validated['results_per_page'] ?? $filters['results_per_page'];
        $page             = $validated['page']             ?? $filters['page'];

        $query = OrganizationDeadline::with(['deadline:id,slug,name,type,description'])
            ->where('organization_id', $firm->id)
            ->orderBy('due_date');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        // Optional month+year filter — only that month's deadlines when given.
        if (! empty($validated['year']) && ! empty($validated['month'])) {
            $startDate = Carbon::create($validated['year'], $validated['month'], 1)->startOfMonth();
            $endDate   = $startDate->copy()->endOfMonth();
            $query->whereBetween('due_date', [$startDate->toDateString(), $endDate->toDateString()]);
        }

        $paginated = $query->paginate((int) $results_per_page, ['*'], 'page', (int) $page);

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to avoid
        // showing a spurious "failed to fetch" notification.
        return $this->sendResponse('RECORDS_FOUND', [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $paginated->lastPage(),
                'current_page'  => $paginated->currentPage(),
                'num_results'   => $paginated->count(),
                'total_results' => $paginated->total(),
            ],
            'organization' => [
                'id'        => $firm->id,
                'guid'      => $firm->guid,
                'firm_name' => $firm->firm_name,
            ],
            'data' => $paginated->items(),
        ]);
    }

    /**
     * POST /api/deadlines/calendar
     * Return firm deadlines for a given month as calendar events.
     * If firm_guid is provided, scoped to that firm; otherwise returns all firms.
     */
    public function calendar(Request $request)
    {
        $rules = [
            'year'      => ['required', 'integer', 'digits:4', 'min:2000', 'max:2100'],
            'month'     => ['required', 'integer', 'min:1', 'max:12'],
            'firm_guid' => ['nullable', 'string'],
            'status'    => ['nullable', 'string', 'in:pending,completed,overdue'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated  = $validator->validated();
        $startDate  = Carbon::create($validated['year'], $validated['month'], 1)->startOfMonth();
        $endDate    = $startDate->copy()->endOfMonth();

        $query = OrganizationDeadline::with([
            'organization:id,guid,firm_name,contact_email',
            'deadline:id,slug,name,type,description',
        ])
        ->whereBetween('due_date', [$startDate->toDateString(), $endDate->toDateString()])
        ->orderBy('due_date');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['firm_guid'])) {
            $firm = Firm::where('guid', $validated['firm_guid'])->first();
            if (! $firm) {
                return $this->sendError('BUSINESS_NOT_FOUND', 200);
            }
            if (! $this->authorizeFirmScope($firm->id, 'firms.manage', 'access_business_account')) {
                return $this->sendError('UNAUTHORIZED', 403);
            }
            $query->where('organization_id', $firm->id);
        } else {
            $firmIds = $this->accessibleFirmIds();
            if ($firmIds !== null) {
                $query->whereIn('organization_id', $firmIds);
            }
        }

        $records = $query->get();

        $events = $records->map(fn ($od) => [
            'id'          => $od->id,
            'date'        => $od->due_date?->toDateString(),
            'title'       => ($od->organization?->firm_name ?? '') . ' — ' . ($od->deadline?->name ?? ''),
            'type'        => $od->deadline?->type,
            'slug'        => $od->deadline?->slug,
            'description' => $od->deadline?->description,
            'status'      => $od->status,
            'notes'       => $od->notes,
            'firm'        => [
                'id'            => $od->organization?->id,
                'guid'          => $od->organization?->guid,
                'firm_name'     => $od->organization?->firm_name,
                'contact_email' => $od->organization?->contact_email,
            ],
        ])->values();

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to avoid
        // showing a spurious "failed to fetch" notification.
        return $this->sendResponse('RECORDS_FOUND', [
            'year'   => (int) $validated['year'],
            'month'  => (int) $validated['month'],
            'total'  => $events->count(),
            'events' => $events,
        ]);
    }

    /**
     * POST /api/deadlines/generate-all
     * Generate or refresh deadlines for every firm in one call.
     */
    public function generateAll(Request $request)
    {
        if (! auth()->user()->hasRole('Admin')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $results  = [];
        $total    = 0;

        Firm::whereNull('deleted_at')->orderBy('id')->chunk(100, function ($firms) use (&$results, &$total) {
            foreach ($firms as $firm) {
                $count = $this->service->generate($firm);
                $results[] = [
                    'organization_id' => $firm->id,
                    'firm_name'       => $firm->firm_name,
                    'generated'       => $count,
                ];
                $total += $count;
            }
        });

        return $this->sendResponse('DEADLINES_GENERATED', [
            'total_generated' => $total,
            'firms'           => $results,
        ]);
    }

    /**
     * POST /api/deadlines/organizations/{id}/generate
     * Regenerate deadlines for a single organization.
     */
    public function generate(Request $request, int $id)
    {
        $firm = Firm::find($id);
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND', 200);
        }
        if (! $this->authorizeFirmManageAction($firm->id, 'firms.manage', 'manage_business_client')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $generated = $this->service->generate($firm);

        return $this->sendResponse('DEADLINES_GENERATED', [
            'organization_id' => $firm->id,
            'firm_name'       => $firm->firm_name,
            'generated'       => $generated,
        ]);
    }
}
