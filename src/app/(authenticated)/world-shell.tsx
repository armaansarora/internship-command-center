"use client";

import dynamic from "next/dynamic";
import { DayNightProvider } from "@/components/world/DayNightProvider";
import { Elevator } from "@/components/world/Elevator";
import { UserMenu } from "@/components/ui/UserMenu";
import { SoundProvider } from "@/components/world/SoundProvider";
import { ErrorBoundary } from "@/components/world/ErrorBoundary";

const NotificationSystem = dynamic(
  () => import("@/components/world/NotificationSystem").then((m) => m.NotificationSystem),
  { ssr: false },
);
const MilestoneToastContainer = dynamic(
  () =>
    import("@/components/world/MilestoneToastContainer").then(
      (m) => m.MilestoneToastContainer,
    ),
  { ssr: false },
);
const SoundToggle = dynamic(
  () => import("@/components/ui/SoundToggle").then((m) => m.SoundToggle),
  { ssr: false },
);
const EasterEggs = dynamic(
  () => import("@/components/world/EasterEggs").then((m) => m.EasterEggs),
  { ssr: false },
);

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
    <SoundProvider>
    <DayNightProvider>
      <div className="relative flex min-h-dvh w-full">
        {/* Elevator panel — left side */}
        <Elevator />

        {/* User menu — top-right, above everything */}
        <div className="fixed top-3 right-3 z-[40] md:top-4 md:right-16">
          <UserMenu
            displayName={displayName}
            email={userEmail}
            avatarUrl={avatarUrl}
          />
        </div>

        {/* Main content area — full-width on mobile, offset for elevator on desktop */}
        <main className="flex-1 md:ml-16 pb-20 md:pb-0">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        {/* Easter eggs — midnight fireworks, confetti, etc. */}
        <EasterEggs />

        {/* In-world notification system — renders on all authenticated floors */}
        <NotificationSystem />

        {/* Progression milestone toasts (gold celebration on threshold unlocks) */}
        <MilestoneToastContainer />

        {/* Sound toggle — fixed bottom-right */}
        <SoundToggle />
      </div>
    </DayNightProvider>
    </SoundProvider>
  );
}
