"use client";

import { DayNightProvider } from "@/components/world/DayNightProvider";
import { CustomCursor } from "@/components/world/CustomCursor";

interface WorldShellProps {
  userId: string;
  children: React.ReactNode;
}

/**
 * WorldShell — client component that assembles the immersive experience layer.
 * Wraps all authenticated content with:
 * - DayNightProvider (time-based CSS custom properties)
 * - CustomCursor (contextual gold cursor)
 * - Elevator panel (Phase 0.6)
 * - Skyline background (Phase 0.5)
 */
export function WorldShell({ children }: WorldShellProps) {
  return (
    <DayNightProvider>
      <div className="relative flex min-h-dvh w-full">
        {/* Elevator panel — left side (Phase 0.6) */}

        {/* Main content area */}
        <main className="flex-1">{children}</main>
      </div>
      <CustomCursor />
    </DayNightProvider>
  );
}
