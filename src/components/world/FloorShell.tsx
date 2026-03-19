"use client";

import type { JSX } from "react";
import type { FloorId } from "@/types/ui";
import { FLOORS } from "@/types/ui";
import { SkylineScene } from "./SkylineScene";

interface FloorShellProps {
  floorId: FloorId;
  children: React.ReactNode;
}

/**
 * FloorShell — wraps each floor's content with the immersive skyline background.
 *
 * Layers (back to front):
 * 1. SkylineScene (photorealistic NYC skyline with parallax + atmosphere)
 * 2. Room content (dashboard panels, floor-specific UI)
 * 3. Floor info badge
 */
export function FloorShell({ floorId, children }: FloorShellProps): JSX.Element {
  const floor = FLOORS.find((f) => f.id === floorId);

  return (
    <div className="relative flex min-h-dvh w-full overflow-hidden">
      {/* Immersive skyline background — replaces old SVG skyline */}
      <SkylineScene floorId={floorId} />

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
