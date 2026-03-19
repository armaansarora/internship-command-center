"use client";

import type { JSX } from "react";
import type { FloorId } from "@/types/ui";
import { FLOORS } from "@/types/ui";
import { ProceduralSkyline } from "./ProceduralSkyline";

interface FloorShellProps {
  floorId: FloorId;
  children: React.ReactNode;
}

/**
 * FloorShell — wraps each floor's content with the immersive procedural skyline.
 *
 * Layers (back to front):
 * 1. ProceduralSkyline (real-time Canvas NYC skyline with parallax + atmosphere)
 * 2. Window frame vignette
 * 3. Glass window mullions
 * 4. Room content (dashboard panels, floor-specific UI)
 * 5. Floor info badge
 */
export function FloorShell({ floorId, children }: FloorShellProps): JSX.Element {
  const floor = FLOORS.find((f) => f.id === floorId);

  return (
    <div className="relative flex min-h-dvh w-full overflow-hidden">
      {/* Immersive procedural skyline background */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <ProceduralSkyline floorId={floorId} />
      </div>

      {/* Window frame vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          boxShadow: "inset 0 0 180px 60px rgba(4, 6, 15, 0.6)",
          zIndex: 1,
        }}
      />

      {/* Window mullions — subtle vertical glass dividers */}
      <div
        className="pointer-events-none absolute inset-0 flex justify-between px-[10%]"
        aria-hidden="true"
        style={{ zIndex: 2 }}
      >
        <div
          className="w-px h-full"
          style={{
            background:
              "linear-gradient(to bottom, rgba(201, 168, 76, 0.04) 0%, rgba(201, 168, 76, 0.1) 50%, rgba(201, 168, 76, 0.04) 100%)",
          }}
        />
        <div
          className="w-px h-full"
          style={{
            background:
              "linear-gradient(to bottom, rgba(201, 168, 76, 0.02) 0%, rgba(201, 168, 76, 0.06) 50%, rgba(201, 168, 76, 0.02) 100%)",
          }}
        />
        <div
          className="w-px h-full"
          style={{
            background:
              "linear-gradient(to bottom, rgba(201, 168, 76, 0.04) 0%, rgba(201, 168, 76, 0.1) 50%, rgba(201, 168, 76, 0.04) 100%)",
          }}
        />
      </div>

      {/* Room content */}
      <div
        className="relative flex-1"
        style={{ zIndex: 10 }}
      >
        {children}
      </div>

      {/* Floor info badge (top-right) */}
      {floor && (
        <div
          className="absolute top-4 right-4 flex items-center gap-2 rounded-full px-4 py-1.5"
          style={{
            zIndex: 20,
            background: "rgba(10, 12, 25, 0.7)",
            backdropFilter: "blur(16px) saturate(1.3)",
            WebkitBackdropFilter: "blur(16px) saturate(1.3)",
            border: "1px solid rgba(201, 168, 76, 0.15)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              color: "var(--gold)",
              letterSpacing: "0.05em",
            }}
          >
            {floor.id}
          </span>
          <span
            className="h-3 w-px"
            style={{ background: "rgba(255, 255, 255, 0.12)" }}
          />
          <span
            className="text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            {floor.name}
          </span>
        </div>
      )}
    </div>
  );
}
