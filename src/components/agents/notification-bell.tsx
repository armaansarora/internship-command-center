"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotificationStream } from "@/hooks/use-notification-stream";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { unreadCount, latestNotification } = useNotificationStream();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (latestNotification && latestNotification.type === "new_notification") {
      setShowToast(true);
      const timeout = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [latestNotification]);

  return (
    <div className="relative">
      <button
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-full transition-colors",
          "hover:bg-[#C9A84C]/10",
          unreadCount > 0 && "text-[#C9A84C]"
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C9A84C] px-1 text-[10px] font-bold text-[#1A1A2E]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {showToast && latestNotification && latestNotification.type === "new_notification" && (
        <div className="absolute right-0 top-10 z-50 w-72 rounded-lg border border-[#C9A84C]/20 bg-[#252540] p-3 shadow-lg animate-in slide-in-from-top-2">
          <p className="text-xs font-semibold text-[#F5F0E8]">{latestNotification.title}</p>
          <p className="text-xs text-[#8B8FA3] mt-1 line-clamp-2">{latestNotification.body}</p>
        </div>
      )}
    </div>
  );
}
