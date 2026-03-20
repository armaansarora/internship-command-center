"use client";

import { DayNightProvider } from "@/components/world/DayNightProvider";
import { Elevator } from "@/components/world/Elevator";

interface WorldShellProps {
  children: React.ReactNode;
}

/**
 * WorldShell — client component that assembles the immersive experience layer.
 * Wraps all authenticated content with:
 * - DayNightProvider (time-based CSS custom properties)
 * - Elevator panel (Phase 0.6)
 * - Skyline background (Phase 0.5)
 *
 * Custom cursor removed (BUG-007) — native cursor with CSS cursor:pointer
 * on interactive elements provides better UX and eliminates a per-frame RAF loop.
 */
export function WorldShell({ children }: WorldShellProps) {
  return (
    <DayNightProvider>
      <div className="relative flex min-h-dvh w-full">
        {/* Elevator panel — left side */}
        <Elevator />

        {/* Main content area — offset for elevator panel on desktop */}
        <main className="flex-1 md:ml-16">{children}</main>
      </div>
    </DayNightProvider>
  );
}
