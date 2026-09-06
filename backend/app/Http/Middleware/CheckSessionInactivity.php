<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CheckSessionInactivity
{
    public function handle(Request $request, Closure $next): mixed
    {
        $bearerToken = $request->bearerToken();

        if (!$bearerToken) {
            return $next($request);
        }

        $hashedToken = hash('sha256', $bearerToken);

        $token = DB::table('personal_access_tokens')
            ->where('token', $hashedToken)
            ->where('tokenable_type', 'App\\Models\\User')
            ->first();

        if (!$token) {
            return $next($request);
        }

        // Use last_used_at if available, otherwise fall back to created_at
        $lastActivity = Carbon::parse($token->last_used_at ?? $token->created_at);
        $timeoutMinutes = (int) env('SESSION_INACTIVITY_TIMEOUT', 45);

        if ($lastActivity->lt(now()->subMinutes($timeoutMinutes))) {
            // Delete ALL tokens for this user — full logout across all devices
            DB::table('personal_access_tokens')
                ->where('tokenable_id', $token->tokenable_id)
                ->where('tokenable_type', $token->tokenable_type)
                ->delete();

            return response()->json([
                'success' => false,
                'message' => 'SESSION_EXPIRED_DUE_TO_INACTIVITY',
            ], 401);
        }

        return $next($request);
    }
}
