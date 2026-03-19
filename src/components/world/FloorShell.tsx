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
 * 2. Floor-specific ambient light tint
 * 3. Window frame vignette (box-shadow inset)
 * 4. Bottom fog gradient
 * 5. Glass window mullions (3 vertical lines at 15%, 50%, 85%)
 * 6. Room content (dashboard panels, floor-specific UI)
 * 7. Floor info badge (top-right)
 */
export function FloorShell({ floorId, children }: FloorShellProps): JSX.Element {
  const floor = FLOORS.find((f) => f.id === floorId);

  // Ambient light: PH = warm golden, Floor 7 = cool blue, others = neutral
  const ambientLight = (() => {
    if (floorId === "PH") {
      return "linear-gradient(to bottom, rgba(201, 168, 76, 0.06) 0%, rgba(201, 168, 76, 0.02) 40%, transparent 100%)";
    }
    if (floorId === "7") {
      return "linear-gradient(to bottom, rgba(80, 140, 220, 0.04) 0%, rgba(80, 140, 220, 0.015) 40%, transparent 100%)";
    }
    return "linear-gradient(to bottom, rgba(160, 170, 200, 0.02) 0%, transparent 50%)";
  })();

  return (
    <div className="relative flex min-h-dvh w-full overflow-hidden">
      {/* Immersive procedural skyline background */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <ProceduralSkyline floorId={floorId} />
      </div>

      {/* Floor-specific ambient light tint */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        aria-hidden="true"
        style={{
          height: "55%",
          background: ambientLight,
          zIndex: 1,
        }}
      />

      {/* Window frame vignette — PH gets lighter (cleaner view at summit) */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          boxShadow:
            floorId === "PH"
              ? "inset 0 0 200px 60px rgba(4, 6, 15, 0.55)"
              : "inset 0 0 250px 80px rgba(4, 6, 15, 0.72)",
          zIndex: 2,
        }}
      />

      {/* Bottom fog gradient — atmospheric depth */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        aria-hidden="true"
        style={{
          height: "35%",
          background:
            "linear-gradient(to top, rgba(6, 8, 18, 0.8) 0%, rgba(6, 8, 18, 0.4) 40%, transparent 100%)",
          zIndex: 3,
        }}
      />

      {/* Window mullions — 3 vertical lines at 15%, 50%, 85% */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ zIndex: 4 }}
      >
        {/* Left mullion at 15% */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: "15%",
            background:
              "linear-gradient(to bottom, rgba(201, 168, 76, 0.03) 0%, rgba(201, 168, 76, 0.12) 50%, rgba(201, 168, 76, 0.03) 100%)",
          }}
        />
        {/* Center mullion at 50% */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: "50%",
            background:
              "linear-gradient(to bottom, rgba(201, 168, 76, 0.02) 0%, rgba(201, 168, 76, 0.07) 50%, rgba(201, 168, 76, 0.02) 100%)",
          }}
        />
        {/* Right mullion at 85% */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: "85%",
            background:
              "linear-gradient(to bottom, rgba(201, 168, 76, 0.03) 0%, rgba(201, 168, 76, 0.12) 50%, rgba(201, 168, 76, 0.03) 100%)",
          }}
        />
      </div>

      {/* Room content */}
      <div className="relative flex-1" style={{ zIndex: 10 }}>
        {children}
      </div>

      {/* Floor info badge (top-right) — gold dot + floor ID + separator + floor name */}
      {floor && (
        <div
          className="absolute top-4 right-4 flex items-center gap-2 rounded-full px-4 py-1.5"
          style={{
            zIndex: 20,
            background: "rgba(10, 12, 25, 0.72)",
            backdropFilter: "blur(16px) saturate(1.4)",
            WebkitBackdropFilter: "blur(16px) saturate(1.4)",
            border: "1px solid rgba(201, 168, 76, 0.18)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Gold dot indicator */}
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "3px",
              height: "3px",
              borderRadius: "50%",
              background: "var(--gold)",
              boxShadow: "0 0 4px rgba(201, 168, 76, 0.7)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              color: "var(--gold)",
              letterSpacing: "0.06em",
              fontWeight: 500,
            }}
          >
            {floor.id}
          </span>
          <span
            className="h-3 w-px"
            style={{ background: "rgba(255, 255, 255, 0.14)" }}
            aria-hidden="true"
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
