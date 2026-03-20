"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import type { FloorId } from "@/types/ui";
import { FLOORS } from "@/types/ui";
import { ProceduralSkyline } from "./ProceduralSkyline";
import { WeatherEffects } from "./WeatherEffects";
import { useWeather } from "@/hooks/useWeather";
import { useSoundEngine } from "./SoundProvider";

interface FloorShellProps {
  floorId: FloorId;
  children: React.ReactNode;
}

// ── Ambient light tint per floor ──────────────────────────────────────────────
// Extracted from inline IIFE so it's a plain lookup — easier to extend.
const AMBIENT_CONFIG: Record<FloorId, string> = {
  PH: "linear-gradient(to bottom, rgba(201, 168, 76, 0.06) 0%, rgba(201, 168, 76, 0.02) 40%, transparent 100%)",
  "7": "linear-gradient(to bottom, rgba(80, 140, 220, 0.04) 0%, rgba(80, 140, 220, 0.015) 40%, transparent 100%)",
  "6": "linear-gradient(to bottom, rgba(160, 170, 200, 0.02) 0%, transparent 50%)",
  "5": "linear-gradient(to bottom, rgba(160, 170, 200, 0.02) 0%, transparent 50%)",
  "4": "linear-gradient(to bottom, rgba(160, 170, 200, 0.02) 0%, transparent 50%)",
  "3": "linear-gradient(to bottom, rgba(160, 170, 200, 0.02) 0%, transparent 50%)",
  "2": "linear-gradient(to bottom, rgba(160, 170, 200, 0.02) 0%, transparent 50%)",
  "1": "linear-gradient(to bottom, rgba(160, 170, 200, 0.02) 0%, transparent 50%)",
  L:   "linear-gradient(to bottom, rgba(160, 170, 200, 0.02) 0%, transparent 50%)",
};

// Vignette shadow differs for PH (cleaner view at summit)
const VIGNETTE_SHADOW: Record<"PH" | "default", string> = {
  PH:      "inset 0 0 200px 60px rgba(4, 6, 15, 0.55)",
  default: "inset 0 0 250px 80px rgba(4, 6, 15, 0.72)",
};

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
 * 7. Floor info badge (top-right) — with breathing scale animation
 * 8. Windowsill gold gradient line (bottom)
 */
export function FloorShell({ floorId, children }: FloorShellProps): JSX.Element {
  const floor       = FLOORS.find((f) => f.id === floorId);
  const ambientLight = AMBIENT_CONFIG[floorId];
  const vignetteShadow = floorId === "PH" ? VIGNETTE_SHADOW.PH : VIGNETTE_SHADOW.default;
  const { condition } = useWeather();
  const { playAmbient } = useSoundEngine();

  // Play ambient soundscape for this floor
  useEffect(() => {
    playAmbient(floorId);
    // Ambient will fade out when the next floor loads
  }, [floorId, playAmbient]);

  return (
    <div className="relative min-h-dvh w-full">

      {/* 1 — Immersive procedural skyline background */}
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <ProceduralSkyline floorId={floorId} />
        {/* 1b — Weather overlay behind floor content */}
        <WeatherEffects condition={condition} />
      </div>

      {/* 2 — Floor-specific ambient light tint */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0"
        aria-hidden="true"
        style={{ height: "55%", background: ambientLight, zIndex: 1 }}
      />

      {/* 3 — Window frame vignette */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{ boxShadow: vignetteShadow, zIndex: 2 }}
      />

      {/* 4 — Bottom fog gradient */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0"
        aria-hidden="true"
        style={{
          height: "35%",
          background: "linear-gradient(to top, rgba(6, 8, 18, 0.8) 0%, rgba(6, 8, 18, 0.4) 40%, transparent 100%)",
          zIndex: 3,
        }}
      />

      {/* 5 — Window mullions at 15%, 50%, 85% */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true" style={{ zIndex: 4 }}>
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: "15%",
            background: "linear-gradient(to bottom, rgba(201, 168, 76, 0.03) 0%, rgba(201, 168, 76, 0.12) 50%, rgba(201, 168, 76, 0.03) 100%)",
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: "50%",
            background: "linear-gradient(to bottom, rgba(201, 168, 76, 0.02) 0%, rgba(201, 168, 76, 0.07) 50%, rgba(201, 168, 76, 0.02) 100%)",
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: "85%",
            background: "linear-gradient(to bottom, rgba(201, 168, 76, 0.03) 0%, rgba(201, 168, 76, 0.12) 50%, rgba(201, 168, 76, 0.03) 100%)",
          }}
        />
      </div>

      {/* 6 — Room content — p-4 on mobile, p-8 on desktop */}
      <div className="relative min-h-dvh p-4 md:p-0" style={{ zIndex: 10 }}>
        {children}
      </div>

      {/* 7 — Floor info badge (top-right) */}
      {floor && (
        <div
          className="glass-refraction fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-28 flex items-center gap-2 rounded-full px-3 py-1 md:px-4 md:py-1.5"
          style={{
            zIndex: 20,
            background: "rgba(10, 12, 25, 0.72)",
            backdropFilter: "blur(16px) saturate(1.4)",
            WebkitBackdropFilter: "blur(16px) saturate(1.4)",
            border: "1px solid rgba(201, 168, 76, 0.18)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
            animation: "floor-badge-breathe 4s ease-in-out infinite",
            position: "fixed",
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
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {floor.name}
          </span>
        </div>
      )}

      {/* 8 — Windowsill gold gradient line */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0"
        aria-hidden="true"
        style={{
          height: "1px",
          background:
            "linear-gradient(to right, transparent 0%, rgba(201, 168, 76, 0.08) 10%, rgba(201, 168, 76, 0.35) 30%, rgba(201, 168, 76, 0.45) 50%, rgba(201, 168, 76, 0.35) 70%, rgba(201, 168, 76, 0.08) 90%, transparent 100%)",
          zIndex: 15,
        }}
      />

      {/* Inline keyframe for badge breathing */}
      <style>{`
        @keyframes floor-badge-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.018); }
        }
      `}</style>
    </div>
  );
}
