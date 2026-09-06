<?php

namespace App\Modules\Notifications\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Config;
use Validator;

use App\Http\Controllers\BaseController;
use App\Modules\Notifications\Models\Notification;

class Notifications extends BaseController
{
    /**
     * List the authenticated user's own notifications, with filters/search.
     */
    public function getAll(Request $request)
    {
        $rules = [
            'type'             => ['nullable', 'array'],
            'type.*'           => ['string'],
            'is_read'          => ['nullable', 'boolean'],
            'from_date'        => ['nullable', 'date'],
            'to_date'          => ['nullable', 'date', 'after_or_equal:from_date'],
            'search'           => ['nullable', 'string'],
            'results_per_page' => ['nullable', 'numeric'],
            'page'             => ['nullable', 'numeric'],
            'order_by'         => ['nullable', 'string', Rule::in(Config::get('notifications.order_by'))],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();

        $filters = Config::get('notifications.filters');

        $results_per_page = $validated['results_per_page'] ?? $filters['results_per_page'];
        $search           = $validated['search']           ?? $filters['search'];
        $page             = $validated['page']              ?? $filters['page'];
        $order_by         = $validated['order_by']          ?? $filters['order_by'];
        $types            = $validated['type']              ?? [];
        $from_date        = $validated['from_date']         ?? null;
        $to_date          = $validated['to_date']           ?? null;

        $sql = Notification::where('receiver_id', auth()->id())->with('sender');

        if (!empty($types)) {
            $sql = $sql->whereIn('type', $types);
        }

        if (array_key_exists('is_read', $validated)) {
            $sql = $sql->where('is_read', $validated['is_read']);
        }

        if (!empty($search)) {
            $sql = $sql->where(function ($query) use ($search) {
                $query->where('title', 'like', "%$search%")
                    ->orWhere('message', 'like', "%$search%");
            });
        }

        if ($from_date) {
            $sql = $sql->whereDate('created_at', '>=', $from_date);
        }

        if ($to_date) {
            $sql = $sql->whereDate('created_at', '<=', $to_date);
        }

        $sql = $sql->orderBy('created_at', $order_by === 'newest_last' ? 'asc' : 'desc');

        $total_results = $sql->count();
        $unread_count  = Notification::where('receiver_id', auth()->id())->where('is_read', false)->count();
        $max    = $total_results > 0 ? ceil($total_results / $results_per_page) : 1;
        $offset = (max(1, $page) - 1) * $results_per_page;

        $records     = $sql->limit($results_per_page)->offset($offset)->get();
        $num_results = count($records);

        $payload = [
            'meta' => [
                'first_page'    => 1,
                'last_page'     => $max,
                'current_page'  => intval($page),
                'num_results'   => $num_results,
                'total_results' => $total_results,
                'unread_count'  => $unread_count,
            ],
            'data' => $records,
        ];

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to
        // avoid showing a spurious "failed to fetch" notification.
        return $this->sendResponse('RECORDS_FOUND', $payload);
    }

    /**
     * Return the authenticated user's unread notification count.
     */
    public function unreadCount(Request $request)
    {
        $unread_count = Notification::where('receiver_id', auth()->id())->where('is_read', false)->count();

        return $this->sendResponse('RECORDS_FOUND', ['unread_count' => $unread_count]);
    }

    /**
     * Mark a single notification (owned by the caller) as read.
     */
    public function markAsRead(Request $request, $id)
    {
        $notification = Notification::where('id', $id)->where('receiver_id', auth()->id())->first();

        if (!$notification) {
            return $this->sendError('NOTIFICATION_NOT_FOUND', 404);
        }

        if (!$notification->is_read) {
            $notification->update(['is_read' => true, 'read_at' => now()]);
        }

        return $this->sendResponse('NOTIFICATION_MARKED_READ', $notification);
    }

    /**
     * Mark all of the authenticated user's unread notifications as read.
     */
    public function markAllAsRead(Request $request)
    {
        $updated_count = Notification::where('receiver_id', auth()->id())
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return $this->sendResponse('NOTIFICATIONS_MARKED_READ', ['updated_count' => $updated_count]);
    }
}
