"use client";

import { DayNightProvider } from "@/components/world/DayNightProvider";
import { Elevator } from "@/components/world/Elevator";
import { UserMenu } from "@/components/ui/UserMenu";
import { NotificationSystem } from "@/components/world/NotificationSystem";

interface WorldShellProps {
  children: React.ReactNode;
  userName: string | null;
  userEmail: string;
  avatarUrl?: string | null;
}

/**
 * WorldShell — client component that assembles the immersive experience layer.
 * Wraps all authenticated content with:
 * - DayNightProvider (time-based CSS custom properties)
 * - Elevator panel (Phase 0.6)
 * - UserMenu (top-right account dropdown — BUG-005)
 */
export function WorldShell({ children, userName, userEmail, avatarUrl }: WorldShellProps) {
  const displayName = userName ?? userEmail.split("@")[0];

  return (
    <DayNightProvider>
      <div className="relative flex min-h-dvh w-full">
        {/* Elevator panel — left side */}
        <Elevator />

        {/* User menu — top-right, above everything */}
        <div className="fixed top-4 right-16 z-[40] hidden md:block">
          <UserMenu
            displayName={displayName}
            email={userEmail}
            avatarUrl={avatarUrl}
          />
        </div>

        {/* Mobile user menu — top-right */}
        <div className="fixed top-3 right-3 z-[40] md:hidden">
          <UserMenu
            displayName={displayName}
            email={userEmail}
            avatarUrl={avatarUrl}
          />
        </div>

        {/* Main content area — offset for elevator panel on desktop */}
        <main className="flex-1 md:ml-16">{children}</main>

        {/* In-world notification system — renders on all authenticated floors */}
        <NotificationSystem />
      </div>
    </DayNightProvider>
  );
}
