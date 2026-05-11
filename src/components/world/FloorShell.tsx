"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import type { FloorId } from "@/types/ui";
import { FLOORS } from "@/types/ui";
import { useSoundEngine } from "./SoundProvider";
import { FLOOR_IDENTITY } from "@/lib/constants/floor-identity";

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
  const identity = FLOOR_IDENTITY[floorId];
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

      {/* Presence ribbon — fixed bottom-left text-only signal that the
          floor's character is "at their station." Reads from the single
          FLOOR_IDENTITY registry so the wording on every floor stays
          consistent and the building feels inhabited even before the user
          interacts with the character. Lobby, Penthouse, C-Suite all
          inherit their own line. Skipped on floors without a character. */}
      {identity?.characterId && (
        <div
          aria-live="polite"
          aria-label={identity.idleAction}
          data-presence-ribbon={identity.characterId}
          className="pointer-events-none hidden md:flex fixed bottom-6 left-24 items-center gap-2"
          style={{
            zIndex: 20,
            paddingLeft: "10px",
            paddingRight: "12px",
            paddingTop: "6px",
            paddingBottom: "6px",
            borderLeft: "1px solid rgba(201, 168, 76, 0.45)",
            background:
              "linear-gradient(90deg, rgba(8,7,14,0.7) 0%, rgba(8,7,14,0.0) 100%)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            opacity: 0.84,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "rgba(232, 196, 90, 0.95)",
              boxShadow: "0 0 6px rgba(201, 168, 76, 0.55)",
              flexShrink: 0,
              animation: "presence-pulse 4s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.16em",
              color: "rgba(245, 220, 160, 0.78)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {identity.idleAction}
          </span>
        </div>
      )}

      <style>{`
        @keyframes floor-badge-breathe {
          0%, 100% {
            opacity: 0.96;
            box-shadow:
              0 4px 20px rgba(0, 0, 0, 0.35),
              inset 0 1px 0 rgba(255,255,255,0.04);
          }
          50% {
            opacity: 1;
            box-shadow:
              0 4px 24px rgba(0, 0, 0, 0.38),
              0 0 18px rgba(201, 168, 76, 0.08),
              inset 0 1px 0 rgba(255,255,255,0.04);
          }
        }
        @keyframes presence-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes floor-badge-breathe {
            0%, 100% { opacity: 0.98; }
          }
          @keyframes presence-pulse {
            0%, 100% { opacity: 0.85; }
          }
        }
      `}</style>
    </div>
  );
}
