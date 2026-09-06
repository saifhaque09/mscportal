"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Circle } from "lucide-react";
import { ROUTES } from "@/config/routes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useNotificationsApi from "@/api/useNotificationsApi";

// Where a notification's type should take the user — client-facing filing
// events always land on their one current filing; the staff-facing
// filing_signed event needs the specific filing id since staff juggle many.
function notificationLink(notification) {
  switch (notification.type) {
    case "filing_sent":
    case "filing_completed":
      return ROUTES.account.myDocumentsFiling;
    case "filing_signed":
      return notification.filing_id
        ? `${ROUTES.business.prepAccountsFiling}?filingId=${notification.filing_id}`
        : null;
    default:
      return null;
  }
}

function timeAgo(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * `variant="grid"` (default) renders as a bordered grid-item button matching
 * the icon+label tiles used throughout the sidebars. `variant="compact"`
 * renders a plain icon-only trigger, for placements without a grid tile
 * pattern (e.g. next to a full-width Logout button).
 */
export default function NotificationBell({ variant = "grid" }) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    getAllNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useNotificationsApi();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    getUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) {
      getAllNotifications({ resultsPerPage: 10, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleRowClick = async (notification) => {
    if (!notification.is_read) {
      await markNotificationRead(notification.id);
      await getUnreadCount();
      await getAllNotifications({ resultsPerPage: 10, page: 1 });
    }

    const link = notificationLink(notification);
    if (link) {
      setOpen(false);
      router.push(link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await getUnreadCount();
    await getAllNotifications({ resultsPerPage: 10, page: 1 });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {variant === "compact" ? (
          <button
            className="relative flex items-center justify-center rounded-lg p-2 hover:bg-accent transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </button>
        ) : (
          <button
            className="relative bg-muted border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors"
            aria-label="Notifications"
          >
            <span className="relative">
              <Bell className="w-5 h-5 text-foreground" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] leading-none"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </span>
            <span className="text-xs font-medium text-foreground">Notifications</span>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={handleMarkAllRead}>
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start gap-1 whitespace-normal py-2"
              onClick={() => handleRowClick(notification)}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className={notification.is_read ? "text-sm text-foreground" : "text-sm font-semibold text-foreground"}>
                  {notification.title}
                </span>
                {!notification.is_read && <Circle className="mt-1 h-2 w-2 shrink-0 fill-blue-500 text-blue-500" />}
              </div>
              <span className="text-xs text-muted-foreground">{notification.message}</span>
              <span className="text-[10px] text-muted-foreground">{timeAgo(notification.created_at)}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
