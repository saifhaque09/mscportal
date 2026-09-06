<?php

namespace App\Modules\Events\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Validator;

use App\Http\Controllers\BaseController;
use App\Modules\Events\Models\Event;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Clients\Models\Firm;
use App\Modules\Notifications\Models\Notification;
use App\Models\User;
use App\Mail\EventCreated;

class Events extends BaseController
{
    private function normalizeTime(?string $value): ?string
    {
        if (empty($value)) return $value;
        try {
            return Carbon::parse($value)->format('H:i');
        } catch (\Exception $e) {
            return $value;
        }
    }

    public function getAll(Request $request)
    {
        $rules = [
            'search'           => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
            'firm_id'          => ['nullable', 'integer', 'exists:firms,id'],
            'date'             => ['nullable', 'date', 'date_format:Y-m-d'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated        = $validator->validated();
        $results_per_page = $validated['results_per_page'] ?? 10;
        $search           = $validated['search']           ?? '';
        $page             = $validated['page']             ?? 1;

        $query = Event::with('firm:id,guid,firm_name')
            ->when(isset($validated['firm_id']), fn ($q) => $q->where('firm_id', $validated['firm_id']))
            ->when(isset($validated['date']),    fn ($q) => $q->whereDate('date', $validated['date']))
            ->when($search !== '', fn ($q) => $q->where(function ($q) use ($search) {
                $q->where('event_name', 'like', "%$search%")
                  ->orWhere('email',    'like', "%$search%")
                  ->orWhere('description', 'like', "%$search%");
            }))
            ->orderBy('date', 'asc')
            ->orderBy('from_time', 'asc');

        $paginated = $query->paginate((int) $results_per_page, ['*'], 'page', (int) $page);

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to avoid
        // showing a spurious "failed to fetch" notification.
        $records = collect($paginated->items())->map(fn ($e) => [
            'id'          => $e->id,
            'guid'        => $e->guid,
            'firm_id'     => $e->firm_id,
            'firm_name'   => $e->firm?->firm_name,
            'event_name'  => $e->event_name,
            'email'       => $e->email,
            'date'        => $e->date->format('Y-m-d'),
            'from_time'   => $e->from_time,
            'to_time'     => $e->to_time,
            'description' => $e->description,
        ]);

        $payload = [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $paginated->lastPage(),
                'current_page'  => $paginated->currentPage(),
                'num_results'   => $paginated->count(),
                'total_results' => $paginated->total(),
            ],
            'data' => $records,
        ];

        return $this->sendResponse('RECORDS_FOUND', $payload);
    }

    public function create(Request $request)
    {
        $input = $request->all();
        if (!empty($input['from_time'])) $input['from_time'] = $this->normalizeTime($input['from_time']);
        if (!empty($input['to_time']))   $input['to_time']   = $this->normalizeTime($input['to_time']);

        $rules = [
            'firm_id'     => ['nullable', 'integer', 'exists:firms,id'],
            'event_name'  => ['required', 'string', 'max:255'],
            'email'       => ['nullable', 'string', 'email', 'max:255'],
            'date'        => ['required', 'date', 'date_format:Y-m-d'],
            'from_time'   => ['required', 'date_format:H:i'],
            'to_time'     => ['required', 'date_format:H:i', 'after:from_time'],
            'description' => ['nullable', 'string'],
        ];

        $validator = Validator::make($input, $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $firmId = $validated['firm_id'] ?? null;

        $exists = Event::where('firm_id',    $firmId)
                       ->where('event_name', $validated['event_name'])
                       ->where('date',       $validated['date'])
                       ->where('from_time',  $validated['from_time'])
                       ->where('to_time',    $validated['to_time'])
                       ->exists();

        if ($exists) {
            return $this->sendError('An event with the same name, date, and start time already exists for this firm.', 422);
        }

        do {
            $guid = Str::random(10);
        } while (Event::where('guid', $guid)->exists());

        $event = Event::create([
            'guid'        => $guid,
            'firm_id'     => $firmId,
            'event_name'  => $validated['event_name'],
            'email'       => $validated['email'] ?? '',
            'date'        => $validated['date'],
            'from_time'   => $validated['from_time'],
            'to_time'     => $validated['to_time'],
            'description' => $validated['description'] ?? null,
        ]);

        $firm = $firmId ? Firm::find($firmId) : null;
        $description = $firm ? "Adding event with {$firm->firm_name}" : "Adding event";
        ActivityLog::record('events', $description, null, auth()->id());

        if ($firm) {
            $this->notifyEventCreated($event, $firm);
        }

        return $this->sendResponse('RECORD_CREATED', $event->fresh());
    }

    /**
     * Notify the firm's Client user(s) that a new event was scheduled for them.
     * Only called when the event has a firm_id — firm-less events don't notify.
     */
    private function notifyEventCreated(Event $event, Firm $firm): void
    {
        $recipients = User::where('firm_id', $firm->id)->role('Client')->get();

        foreach ($recipients as $recipient) {
            Notification::record(
                $recipient->id,
                'New event scheduled',
                "An event \"{$event->event_name}\" was scheduled for {$firm->firm_name} on {$event->date->format('Y-m-d')}.",
                'event_created',
                auth()->id()
            );
        }

        // The event's own `email` field lets the creator override who gets
        // notified; leaving it blank falls back to every Client-role user on the firm.
        $recipientEmails = $event->email !== ''
            ? [$event->email]
            : $recipients->pluck('email')->filter()->all();

        $mailData = [
            'firm_name'   => $firm->firm_name,
            'event_name'  => $event->event_name,
            'date'        => $event->date->format('Y-m-d'),
            'from_time'   => $event->from_time,
            'to_time'     => $event->to_time,
            'description' => $event->description,
        ];

        foreach ($recipientEmails as $recipientEmail) {
            try {
                Mail::to($recipientEmail)->send(new EventCreated($mailData));
            } catch (\Exception $e) {
                Log::error('EventCreated mail failed', [
                    'email' => $recipientEmail,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    public function edit(Request $request, string $guid = '')
    {
        $event = Event::where('guid', $guid)->first();

        if (!$event) {
            return $this->sendError('EVENT_NOT_FOUND', 404);
        }

        $input = $request->all();
        if (!empty($input['from_time'])) $input['from_time'] = $this->normalizeTime($input['from_time']);
        if (!empty($input['to_time']))   $input['to_time']   = $this->normalizeTime($input['to_time']);

        $rules = [
            'firm_id'     => ['nullable', 'integer', 'exists:firms,id'],
            'event_name'  => ['nullable', 'string', 'max:255'],
            'email'       => ['nullable', 'string', 'email', 'max:255'],
            'date'        => ['nullable', 'date', 'date_format:Y-m-d'],
            'from_time'   => ['nullable', 'date_format:H:i'],
            'to_time'     => ['nullable', 'date_format:H:i', 'after:from_time'],
            'description' => ['nullable', 'string'],
        ];

        $validator = Validator::make($input, $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $newFirmId   = $validated['firm_id']     ?? $event->firm_id;
        $newName     = $validated['event_name']  ?? $event->event_name;
        $newDate     = $validated['date']         ?? $event->date->format('Y-m-d');
        $newFromTime = $validated['from_time']    ?? $event->from_time;
        $newToTime   = $validated['to_time']      ?? $event->to_time;

        $duplicate = Event::where('firm_id',    $newFirmId)
                          ->where('event_name', $newName)
                          ->where('date',       $newDate)
                          ->where('from_time',  $newFromTime)
                          ->where('to_time',    $newToTime)
                          ->where('id', '!=',   $event->id)
                          ->exists();

        if ($duplicate) {
            return $this->sendError('An event with the same name, date, and time already exists for this firm.', 422);
        }

        $event->update([
            'firm_id'     => $newFirmId,
            'event_name'  => $newName,
            'email'       => $validated['email']       ?? $event->email,
            'date'        => $newDate,
            'from_time'   => $newFromTime,
            'to_time'     => $newToTime,
            'description' => array_key_exists('description', $validated) ? $validated['description'] : $event->description,
        ]);

        $newFirm = $newFirmId ? Firm::find($newFirmId) : null;
        $description = $newFirm ? "Editing event with {$newFirm->firm_name}" : "Editing event";
        ActivityLog::record('events', $description, null, auth()->id());

        if ($newFirm) {
            $this->notifyEventEdited($event, $newFirm);
        }

        return $this->sendResponse('RECORD_UPDATED', $event->fresh());
    }

    /**
     * Notify the firm's Client user(s) that an event tied to their firm was edited.
     * Only called when the event (post-edit) has a firm_id — firm-less events don't notify.
     */
    private function notifyEventEdited(Event $event, Firm $firm): void
    {
        $recipients = User::where('firm_id', $firm->id)->role('Client')->get();

        foreach ($recipients as $recipient) {
            Notification::record(
                $recipient->id,
                'Event updated',
                "The event \"{$event->event_name}\" for {$firm->firm_name} on {$event->date->format('Y-m-d')} has been updated.",
                'event_updated',
                auth()->id()
            );
        }
    }

    public function delete(Request $request)
    {
        $rules = [
            'guid' => ['required', 'array'],
            'guid.*' => ['string', 'exists:events,guid'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $events = Event::whereIn('guid', $validated['guid'])->get(['firm_id', 'event_name', 'date']);

        $deleted = Event::whereIn('guid', $validated['guid'])->delete();

        if ($deleted) {
            foreach ($events as $event) {
                $firm = $event->firm_id ? Firm::find($event->firm_id) : null;
                $description = $firm ? "Deleting event with {$firm->firm_name}" : "Deleting event";
                ActivityLog::record('events', $description, null, auth()->id());

                if ($firm) {
                    $this->notifyEventDeleted($event, $firm);
                }
            }

            return $this->sendResponse('RECORDS_DELETED');
        }

        return $this->sendError('RECORDS_NOT_FOUND', 404);
    }

    /**
     * Notify the firm's Client user(s) that an event tied to their firm was deleted.
     * $event here is the pre-delete snapshot captured before the bulk ->delete() ran.
     * Only called when the event had a firm_id — firm-less events don't notify.
     */
    private function notifyEventDeleted(Event $event, Firm $firm): void
    {
        $recipients = User::where('firm_id', $firm->id)->role('Client')->get();

        foreach ($recipients as $recipient) {
            Notification::record(
                $recipient->id,
                'Event deleted',
                "The event \"{$event->event_name}\" for {$firm->firm_name} on {$event->date->format('Y-m-d')} has been deleted.",
                'event_deleted',
                auth()->id()
            );
        }
    }
}
