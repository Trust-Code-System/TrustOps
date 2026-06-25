"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/modules/notifications/actions";
import { renderTemplate } from "@/modules/messaging/templates";
import { formatDateTime } from "@/modules/shared/format";
import { cn } from "@/lib/utils";
import type { Notification } from "@/modules/shared/types";

/**
 * In-app notifications bell — makes the Phase 0 placeholder real. Shows unread
 * count, lists recent in-app notifications, marks read. Live updates arrive on
 * navigation/refresh (real-time subscription is a later enhancement).
 */
export function NotificationsBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function readOne(id: string) {
    await markNotificationRead(id);
    router.refresh();
  }
  async function readAll() {
    await markAllNotificationsRead();
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-text-muted hover:bg-gray-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-[600] text-text-on-primary">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-border-subtle bg-surface-card shadow-md"
        >
          <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
            <span className="text-body-strong">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={readAll}
                className="text-small font-[600] text-primary-600"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-8 text-center text-small text-text-muted">
                You&apos;re all caught up.
              </p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "border-b border-border-subtle last:border-0",
                      !n.read_at && "bg-primary-50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => !n.read_at && readOne(n.id)}
                      className="block w-full px-3 py-2 text-left hover:bg-gray-100"
                    >
                      <p className="text-small text-text-primary">
                        {renderTemplate(n.template, n.payload)}
                      </p>
                      <p className="mt-0.5 text-caption text-text-muted">
                        {formatDateTime(n.created_at)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
