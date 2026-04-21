"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import type { FloorId } from "@/types/ui";
import { FLOORS } from "@/types/ui";
import { useSoundEngine } from "./SoundProvider";

interface FloorShellProps {
  floorId: FloorId;
  children: React.ReactNode;
}

/**
 * FloorShell — wraps each floor's content with floor identity badge + ambient sound.
 *
 * The expensive world chrome (skyline canvas, weather, vignette, fog,
 * mullions, windowsill, ambient color tint) is mounted ONCE in WorldShell
 * via PersistentWorld and stays alive across every floor navigation.
 * That eliminates per-navigation canvas regeneration (the main lag source)
 * and lets the camera offset + ambient color tween smoothly between floors
 * during the elevator timeline — making transitions feel like real altitude
 * change rather than a slide swap.
 *
 * This shell is now a thin per-floor wrapper:
 *   - Mounts the floor's children inside the room z-layer (above world chrome)
 *   - Renders the floor identity badge (top-right)
 *   - Triggers the floor's ambient soundscape
 */
export function FloorShell({ floorId, children }: FloorShellProps): JSX.Element {
  const floor = FLOORS.find((f) => f.id === floorId);
  const { playAmbient } = useSoundEngine();

  useEffect(() => {
    playAmbient(floorId);
  }, [floorId, playAmbient]);

  return (
    <div className="relative min-h-dvh w-full">
      {/* Room content — sits above the persistent world chrome at z-index 10 */}
      <div className="relative min-h-dvh p-4 md:p-0" style={{ zIndex: 10 }}>
        {children}
      </div>

      {/* Floor info badge (top-right) */}
      {floor && (
        <div
          className="glass-refraction fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-28 flex items-center gap-2 rounded-full px-3 py-1 md:px-4 md:py-1.5"
          style={{
            zIndex: 20,
            background: "rgba(10, 12, 25, 0.72)",
            backdropFilter: "blur(16px) saturate(1.4)",
            WebkitBackdropFilter: "blur(16px) saturate(1.4)",
            border: "1px solid rgba(201, 168, 76, 0.18)",
            boxShadow:
              "0 4px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
            animation: "floor-badge-breathe 4s ease-in-out infinite",
            position: "fixed",
          }}
        >
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
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {floor.name}
          </span>
        </div>
      )}

      <style>{`
        @keyframes floor-badge-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.018); }
        }
      `}</style>
    </div>
  );
}
