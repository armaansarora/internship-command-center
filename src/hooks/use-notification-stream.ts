"use client";

import { useState, useEffect } from "react";
import { NotificationSSEEvent } from "@/contracts/api";
import type { UseNotificationStreamReturn } from "@/contracts/ui";
import type { z } from "zod/v4";

type NotifEvent = z.infer<typeof NotificationSSEEvent>;

export function useNotificationStream(): UseNotificationStreamReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<NotifEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.onopen = () => setIsConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const parsed = NotificationSSEEvent.safeParse(data);
        if (parsed.success) {
          if (parsed.data.type === "new_notification") {
            setLatestNotification(parsed.data);
            setUnreadCount((prev) => prev + 1);
          } else if (parsed.data.type === "unread_count") {
            setUnreadCount(parsed.data.count);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => setIsConnected(false);

    return () => es.close();
  }, []);

  return { unreadCount, latestNotification, isConnected };
}
