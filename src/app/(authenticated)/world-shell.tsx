"use client";

import dynamic from "next/dynamic";
import { DayNightProvider } from "@/components/world/DayNightProvider";
import { Elevator } from "@/components/world/Elevator";
import { PersistentWorld } from "@/components/world/PersistentWorld";
import { UserMenu } from "@/components/ui/UserMenu";
import { SoundProvider } from "@/components/world/SoundProvider";
import { ErrorBoundary } from "@/components/world/ErrorBoundary";
import { FocusModeShortcut } from "@/components/world/FocusModeShortcut";

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
  /** Focus Mode (Fix #4): hides world chrome when true. */
  focusMode: boolean;
}

/**
 * WorldShell — client component that assembles the immersive experience layer.
 * Wraps all authenticated content with:
 * - DayNightProvider (time-based CSS custom properties)
 * - Elevator panel (Phase 0.6)
 * - UserMenu (top-right account dropdown — BUG-005)
 *
 * Focus Mode (Fix #4): when `focusMode` is true, the immersive chrome
 * (PersistentWorld, Elevator, EasterEggs, MilestoneToastContainer) is
 * unmounted to let the user concentrate on the floor content. The
 * essential controls (UserMenu, NotificationSystem, SoundToggle,
 * FocusModeShortcut) stay mounted. The shell falls back to a flat dark
 * surface so floor content sits on a known background instead of the
 * absent skyline.
 */
export function WorldShell({
  children,
  userName,
  userEmail,
  avatarUrl,
  focusMode,
}: WorldShellProps) {
  const displayName = userName ?? userEmail.split("@")[0];

  return (
    <SoundProvider>
    <DayNightProvider>
      <div
        className="relative flex min-h-dvh w-full"
        style={
          focusMode
            ? { background: "#0A0C19" }
            : undefined
        }
      >
        {!focusMode && (
          <>
            {/* Persistent world chrome — skyline + weather + window framing.
                Mounts ONCE here and stays alive across every floor navigation,
                so the expensive canvas never regenerates and the camera can
                tween smoothly between floor offsets during elevator transitions. */}
            <PersistentWorld />

            {/* Elevator panel — left side */}
            <Elevator />
          </>
        )}

        {/* User menu — top-right, above everything */}
        <div className="fixed top-3 right-3 z-[40] md:top-4 lg:right-16">
          <UserMenu
            displayName={displayName}
            email={userEmail}
            avatarUrl={avatarUrl}
          />
        </div>

        {/* Main content area — full-width on mobile, offset for elevator on desktop.
            `min-w-0` + `overflow-x-hidden` prevent wide floor content (e.g. the
            war table's horizontal kanban) from pushing this flex child past
            the viewport and causing body-level horizontal scroll. Internal
            scroll containers (war table, rolodex grid, etc.) still work
            because they own their own `overflow-x: auto`.

            Focus Mode drops the desktop `lg:ml-16` rail offset because the
            elevator that occupied that gutter is unmounted. */}
        <main
          className={
            focusMode
              ? "flex-1 min-w-0 overflow-x-hidden pb-20 lg:pb-0"
              : "flex-1 min-w-0 overflow-x-hidden pb-20 lg:ml-16 lg:pb-0"
          }
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        {!focusMode && (
          <>
            {/* Easter eggs — midnight fireworks, confetti, etc. */}
            <EasterEggs />

            {/* Progression milestone toasts (gold celebration on threshold unlocks) */}
            <MilestoneToastContainer />
          </>
        )}

        {/* In-world notification system — renders on all authenticated floors */}
        <NotificationSystem />

        {/* Sound toggle — fixed bottom-right */}
        <SoundToggle />

        {/* Focus Mode keyboard listener — always mounted so the user can
            toggle out of focus mode in either direction. */}
        <FocusModeShortcut focusMode={focusMode} />
      </div>
    </DayNightProvider>
    </SoundProvider>
  );
}
