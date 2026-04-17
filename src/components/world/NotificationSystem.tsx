"use client";

import type { JSX } from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationToast } from "./NotificationToast";
import type { ToastNotification } from "./NotificationToast";

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 8_000;

/**
 * NotificationSystem — in-world spatial notification manager.
 *
 * Polls /api/notifications for unread notifications.
 * Displays up to 3 stacked toasts at bottom-right.
 * Auto-dismisses after 8 seconds.
 */
export function NotificationSystem(): JSX.Element {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const seenIds = useRef(new Set<string>());
  const autoDismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = autoDismissTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      autoDismissTimers.current.delete(id);
    }
    // Mark as read server-side (fire and forget)
    void fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => null);
  }, []);

  const addToast = useCallback(
    (notification: ToastNotification) => {
      if (seenIds.current.has(notification.id)) return;
      seenIds.current.add(notification.id);

      setToasts((prev) => {
        // Keep max 3, newest at bottom
        const next = [notification, ...prev].slice(0, MAX_VISIBLE);
        return next;
      });

      // Schedule auto-dismiss
      const timer = setTimeout(() => {
        dismissToast(notification.id);
      }, AUTO_DISMISS_MS);
      autoDismissTimers.current.set(notification.id, timer);
    },
    [dismissToast]
  );

  // Poll for notifications
  useEffect(() => {
    let cancelled = false;

    async function pollNotifications() {
      try {
        const res = await fetch("/api/notifications?unread=true");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { notifications?: ToastNotification[] };
        const notifications = data.notifications ?? [];
        for (const n of notifications) {
          if (!cancelled) addToast(n);
        }
      } catch {
        // Silently fail — notifications are non-critical
      }
    }

    void pollNotifications();
    const interval = setInterval(pollNotifications, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [addToast]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = autoDismissTimers.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  if (toasts.length === 0) return <></>;

  return (
    <div
      aria-label="In-world notifications"
      role="region"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "48px", // above ticker
        right: "16px",
        width: "min(340px, 90vw)",
        zIndex: 60,
        pointerEvents: "none", // children opt back in
      }}
    >
      {/* Render in reverse so newest is at top visually */}
      {[...toasts].reverse().map((toast, i) => (
        <div
          key={toast.id}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "100%",
            pointerEvents: "all",
          }}
        >
          <NotificationToast
            notification={toast}
            onDismiss={dismissToast}
            index={toasts.length - 1 - i}
          />
        </div>
      ))}
    </div>
  );
}
