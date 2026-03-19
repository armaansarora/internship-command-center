"use client";

import type { FloorId } from "@/types/ui";
import { FLOORS } from "@/types/ui";
import { Skyline } from "./Skyline";

interface FloorShellProps {
  floorId: FloorId;
  children: React.ReactNode;
}

/**
 * FloorShell — wraps each floor's content with the window frame, skyline view,
 * and floor-specific ambient adjustments.
 *
 * Layers (back to front):
 * 1. Sky gradient (CSS vars from day/night cycle)
 * 2. Skyline (4-layer parallax SVG)
 * 3. Window tint overlay
 * 4. Room content
 * 5. Floor info badge (UI layer)
 */
export function FloorShell({ floorId, children }: FloorShellProps) {
  const floor = FLOORS.find((f) => f.id === floorId);

  return (
    <div className="relative flex min-h-dvh w-full overflow-hidden">
      {/* Background: Sky gradient (responds to data-time via CSS vars) */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to bottom,
            hsl(var(--sky-hue) var(--sky-saturation) var(--sky-lightness)),
            hsl(var(--sky-hue) calc(var(--sky-saturation) * 0.7) calc(var(--sky-lightness) * 0.6))
          )`,
          zIndex: 0,
        }}
      />

      {/* NYC Skyline with parallax */}
      <Skyline floorId={floorId} />

      {/* Window tint overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "var(--window-tint)",
          zIndex: 2,
        }}
      />

      {/* Room content */}
      <div
        className="relative flex-1"
        style={{ zIndex: "var(--z-room)" as string }}
      >
        {children}
      </div>

      {/* Floor info badge (top-right) */}
      {floor && (
        <div
          className="absolute top-4 right-4 flex items-center gap-2 glass rounded-full px-4 py-1.5"
          style={{ zIndex: "var(--z-ui)" as string }}
        >
          <span className="floor-label text-xs">{floor.id}</span>
          <span className="h-3 w-px bg-[var(--glass-border)]" />
          <span className="text-xs text-[var(--text-secondary)]">
            {floor.name}
          </span>
        </div>
      )}
    </div>
  );
}
