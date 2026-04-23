"use client";

import { useEffect, useRef, type JSX } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap-init";
import { ProceduralSkyline } from "./ProceduralSkyline";
import { WeatherEffects } from "./WeatherEffects";
import { PneumaticTubeArrivalOverlay } from "./PneumaticTubeArrivalOverlay";
import { useWeather } from "@/hooks/useWeather";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ROUTE_TO_FLOOR } from "@/lib/constants/floors";
import { FLOOR_OFFSETS } from "@/lib/skyline-engine";
import type { FloorId } from "@/types/ui";

/* ───────────────────────────────────────────────────────────────
   Per-floor ambient light tint — drives the soft color cast over
   the upper 55% of the viewport. Cross-fades smoothly between
   floors during elevator transitions so the room "feels" different
   even though the same skyline is visible through the windows.
   ─────────────────────────────────────────────────────────────── */
interface AmbientColor {
  r: number;
  g: number;
  b: number;
  intensity: number; // alpha multiplier — higher = stronger floor identity
}

const AMBIENT_COLORS: Record<FloorId, AmbientColor> = {
  PH:  { r: 201, g: 168, b:  76, intensity: 1.00 }, // gold (penthouse)
  "7": { r:  80, g: 140, b: 220, intensity: 0.75 }, // tactical blue (war room)
  "6": { r: 200, g: 180, b: 160, intensity: 0.55 }, // warm cream (rolodex)
  "5": { r: 180, g: 130, b: 200, intensity: 0.55 }, // ink purple (writing)
  "4": { r: 230, g: 130, b:  80, intensity: 0.65 }, // amber alert (situation)
  "3": { r: 100, g: 180, b: 200, intensity: 0.55 }, // briefing teal
  "2": { r: 180, g: 200, b: 230, intensity: 0.45 }, // observatory sky
  "1": { r: 201, g: 168, b:  76, intensity: 0.85 }, // gold (c-suite)
  L:   { r: 201, g: 168, b:  76, intensity: 0.55 }, // gold (lobby)
};

function deriveFloorId(pathname: string): FloorId {
  const match = Object.entries(ROUTE_TO_FLOOR).find(([route]) =>
    pathname.startsWith(route),
  );
  return match ? (match[1] as FloorId) : "PH";
}

function ambientGradient(c: AmbientColor): string {
  const a1 = (c.intensity * 0.06).toFixed(3);
  const a2 = (c.intensity * 0.02).toFixed(3);
  const r = Math.round(c.r);
  const g = Math.round(c.g);
  const b = Math.round(c.b);
  return `linear-gradient(to bottom, rgba(${r},${g},${b},${a1}) 0%, rgba(${r},${g},${b},${a2}) 40%, transparent 100%)`;
}

/**
 * PersistentWorld — mounts the expensive world chrome ONCE inside WorldShell
 * and keeps it alive across every floor navigation.
 *
 * What persists:
 *   - ProceduralSkyline canvas (the main lag source — never remounts)
 *   - WeatherEffects overlay
 *   - Ambient color tint (cross-fades between floors)
 *   - Window vignette, bottom fog, mullions, windowsill gold line
 *
 * What floors still own (in FloorShell):
 *   - The floor badge (per-floor identity)
 *   - The room scene contents (each floor's furniture/panels)
 *   - Per-floor sound ambient
 *
 * On pathname change: GSAP tweens the skyline's vertical offset and the
 * ambient color over ~1.2s with a smooth ease, perfectly matched to the
 * elevator's GSAP timeline. By the time the elevator doors open you're
 * already at the new floor's view — the camera has literally risen or
 * descended through the building.
 *
 * The tweens mutate plain refs (not React state) so 60fps animation does
 * not trigger React re-renders — the canvas RAF loop reads from
 * `offsetRef.current` each frame, and the ambient div is mutated directly
 * via `style.background` in the GSAP onUpdate callback.
 */
export function PersistentWorld(): JSX.Element {
  const pathname = usePathname();
  const floorId = deriveFloorId(pathname);
  const reduced = useReducedMotion();
  const { condition } = useWeather();

  // Mutable animation targets — driven by GSAP, read by canvas + DOM.
  const offsetRef = useRef<number>(FLOOR_OFFSETS[floorId]);
  const colorRef = useRef<AmbientColor>({ ...AMBIENT_COLORS[floorId] });
  const ambientDivRef = useRef<HTMLDivElement>(null);

  // Apply the initial gradient to the DOM via ref on mount, so the
  // JSX-controlled style never contains `background` — that prevents any
  // subsequent React re-render from thrashing the tween-written value.
  useEffect(() => {
    const div = ambientDivRef.current;
    if (div) div.style.background = ambientGradient(colorRef.current);
    // Mount only.
     
  }, []);

  // Tween between floor configurations whenever the floor changes.
  //
  // Timing note: the Elevator's GSAP timeline is ~2.1s total. router.push()
  // fires ~0.8s in (doors fully closed). Doors begin opening ~1.4s in.
  // A 0.7s tween starting at 0.8s finishes at 1.5s — so ~90% of the camera
  // motion happens behind closed doors, and the last ~100ms tail plays as
  // the doors part. This gives a strong sense of arrival without any
  // visible slow drift during the open state.
  useEffect(() => {
    const targetOffset = FLOOR_OFFSETS[floorId];
    const targetColor = AMBIENT_COLORS[floorId];

    if (reduced) {
      offsetRef.current = targetOffset;
      colorRef.current = { ...targetColor };
      const div = ambientDivRef.current;
      if (div) div.style.background = ambientGradient(targetColor);
      return;
    }

    const offsetTween = gsap.to(offsetRef, {
      current: targetOffset,
      duration: 0.7,
      ease: "power3.out",
    });

    const colorTween = gsap.to(colorRef.current, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      intensity: targetColor.intensity,
      duration: 0.7,
      ease: "power3.out",
      onUpdate: () => {
        const div = ambientDivRef.current;
        if (div) div.style.background = ambientGradient(colorRef.current);
      },
    });

    return () => {
      offsetTween.kill();
      colorTween.kill();
    };
  }, [floorId, reduced]);

  return (
    <>
      {/* 1 — Persistent skyline canvas (NEVER remounts across navigations) */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <ProceduralSkyline floorId={floorId} externalOffsetRef={offsetRef} />
        <WeatherEffects condition={condition} />
      </div>

      {/* 2 — Ambient color tint — cross-fades between floors.
           The `background` is written only via the ref in useEffect/tween,
           never via JSX — so React re-renders cannot clobber the tween. */}
      <div
        ref={ambientDivRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0"
        style={{
          height: "55%",
          zIndex: 1,
        }}
      />

      {/* 3 — Window frame vignette */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          boxShadow: "inset 0 0 250px 80px rgba(4, 6, 15, 0.72)",
          zIndex: 2,
        }}
      />

      {/* 4 — Bottom fog gradient */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0"
        aria-hidden="true"
        style={{
          height: "35%",
          background:
            "linear-gradient(to top, rgba(6, 8, 18, 0.8) 0%, rgba(6, 8, 18, 0.4) 40%, transparent 100%)",
          zIndex: 3,
        }}
      />

      {/* 5 — Window mullions at 15%, 50%, 85% */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{ zIndex: 4 }}
      >
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: "15%",
            background:
              "linear-gradient(to bottom, rgba(201, 168, 76, 0.03) 0%, rgba(201, 168, 76, 0.12) 50%, rgba(201, 168, 76, 0.03) 100%)",
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: "50%",
            background:
              "linear-gradient(to bottom, rgba(201, 168, 76, 0.02) 0%, rgba(201, 168, 76, 0.07) 50%, rgba(201, 168, 76, 0.02) 100%)",
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: "85%",
            background:
              "linear-gradient(to bottom, rgba(201, 168, 76, 0.03) 0%, rgba(201, 168, 76, 0.12) 50%, rgba(201, 168, 76, 0.03) 100%)",
          }}
        />
      </div>

      {/* 6 — Windowsill gold gradient line */}
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

      {/* 7 — Pneumatic-tube arrival overlay (R7.4). System-wide delivery
           channel for notifications whose channels include "pneumatic_tube".
           Mounted here (inside PersistentWorld) so every authenticated floor
           inherits it — the bell-icon-dropdown pattern is gone. */}
      <PneumaticTubeArrivalOverlay />
    </>
  );
}
