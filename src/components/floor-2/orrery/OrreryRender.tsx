"use client";

import type { CSSProperties, JSX } from "react";
import { useEffect, useMemo, useRef } from "react";
import { gsap } from "@/lib/gsap-init";
import type { OrreryPlanet, PatternMode, Tier } from "@/lib/orrery/types";
import "./orrery.css";

/**
 * OrreryRender.
 *
 * The CSS 3D render primitive for the Observatory's orrery. THIS FILE is the
 * single boundary in the codebase that uses `transform-style: preserve-3d`
 * for the orrery — callers consume the typed `OrreryPlanet[]` from R9.1 and
 * never reach in. Swapping to R3F later is a single-file replacement.
 *
 * Architecture:
 *   • 4 concentric tilted orbit rings (one per tier 1–4); inner rings smaller
 *     and faster, outer rings larger and slower.
 *   • Planets are <button>s positioned in polar coords on each ring, with
 *     a counter-rotation that keeps content (none today, labels later)
 *     readable as the ring spins.
 *   • ONE GSAP timeline drives all four ring rotations (single RAF loop).
 *     A separate camera-dolly tween handles focusPlanetId zoom.
 *   • Reduced motion drops the timeline AND adds `orrery-reduced` to the
 *     scene root so CSS-driven animations are suppressed too.
 *
 * Perf invariants (asserted by R9.5):
 *   • ≤ 1 `gsap.timeline(...)` call in this file.
 *   • No per-planet `will-change` (only on `.orrery-orbit`).
 *   • Planet count cap is the data layer's call; render handles whatever ships.
 */

/** Tier → orbit ring outer-radius, as a fraction of the scene's half-width. */
const TIER_RADIUS_PCT: Record<Tier, number> = {
  1: 0.22,
  2: 0.42,
  3: 0.62,
  4: 0.82,
};

/** Tier → seconds per full revolution. Inner faster, outer slower. */
const TIER_REVOLUTION_SECONDS: Record<Tier, number> = {
  1: 45,
  2: 60,
  3: 75,
  4: 90,
};

const ALL_TIERS: Tier[] = [1, 2, 3, 4];

/** Camera dolly target scale when focusing a single planet. */
const FOCUS_SCALE = 1.4;
const FOCUS_DURATION_S = 0.6;

interface Props {
  planets: OrreryPlanet[];
  /** Mode is currently informational — used in aria, no morph here (R9.4). */
  mode: PatternMode;
  focusPlanetId: string | null;
  reducedMotion: boolean;
  onPlanetClick: (id: string) => void;
}

/**
 * Group planets by tier so the render tree mirrors the physical metaphor
 * (one ring per tier). Stable order: tier 1, 2, 3, 4.
 */
function groupByTier(planets: OrreryPlanet[]): Map<Tier, OrreryPlanet[]> {
  const map = new Map<Tier, OrreryPlanet[]>();
  for (const tier of ALL_TIERS) map.set(tier, []);
  for (const p of planets) {
    const bucket = map.get(p.tier);
    if (bucket) bucket.push(p);
  }
  return map;
}

/**
 * The polar-to-cartesian transform that pins a planet to a point on its
 * ring, then counter-rotates by the same angle so child content (text glyph,
 * future label tooltip) stays upright as the ring rotates.
 *
 * Mode in CSS-3D space is identical to a 2D rotation around the ring's
 * center — the rotateX(60deg) on the parent ring tilts the whole plane.
 */
function planetTransform(angleDeg: number): string {
  return `rotate(${angleDeg}deg) translateY(-50%) rotate(${-angleDeg}deg)`;
}

export function OrreryRender({
  planets,
  mode,
  focusPlanetId,
  reducedMotion,
  onPlanetClick,
}: Props): JSX.Element {
  const sceneRef = useRef<HTMLDivElement>(null);
  const orbitsByTier = useMemo(() => groupByTier(planets), [planets]);

  // ── Single GSAP timeline drives all 4 orbit rotations ──────────────────
  // One RAF loop, four targets, linear ease. This is the perf gate — R9.5
  // asserts ≤ 1 `gsap.timeline()` call in this file.
  useEffect(() => {
    if (reducedMotion) return;
    const scene = sceneRef.current;
    if (!scene) return;

    const tl = gsap.timeline({ repeat: -1 });
    for (const tier of ALL_TIERS) {
      const ring = scene.querySelector<HTMLElement>(`[data-orrery-orbit="${tier}"]`);
      if (!ring) continue;
      tl.to(
        ring,
        {
          rotate: 360,
          duration: TIER_REVOLUTION_SECONDS[tier],
          ease: "none",
          repeat: -1,
        },
        0,
      );
    }

    return () => {
      tl.kill();
    };
  }, [reducedMotion, planets.length]);

  // ── Camera dolly on focus ──────────────────────────────────────────────
  // A separate tween (NOT a second timeline) zooms the scene container in
  // when a planet is focused, out when the focus clears.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const targetScale = focusPlanetId ? FOCUS_SCALE : 1;
    const duration = reducedMotion ? 0 : FOCUS_DURATION_S;
    const tween = gsap.to(scene, {
      scale: targetScale,
      duration,
      ease: "power2.out",
      overwrite: "auto",
    });
    return () => {
      tween.kill();
    };
  }, [focusPlanetId, reducedMotion]);

  const planetCount = planets.length;
  const sceneAriaLabel =
    planetCount === 0
      ? "Pipeline orrery: empty"
      : `Pipeline orrery: ${planetCount} application${planetCount === 1 ? "" : "s"}`;

  const sceneClass = ["orrery-scene", reducedMotion ? "orrery-reduced" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={sceneRef}
      className={sceneClass}
      role="img"
      aria-label={sceneAriaLabel}
      data-orrery-mode={mode}
    >
      {ALL_TIERS.map((tier) => {
        const ringPlanets = orbitsByTier.get(tier) ?? [];
        const sizePct = TIER_RADIUS_PCT[tier] * 100;
        const ringStyle: CSSProperties = {
          width: `${sizePct}%`,
          height: `${sizePct}%`,
        };
        return (
          <div
            key={tier}
            className="orrery-orbit"
            data-orrery-orbit={tier}
            style={ringStyle}
            aria-hidden="true"
          >
            {ringPlanets.map((p) => {
              const planetClasses = [
                "orrery-planet",
                p.isSupernova ? "orrery-supernova" : null,
                p.isFading ? "orrery-fading" : null,
                p.hasSatellite ? "orrery-satellite" : null,
              ]
                .filter(Boolean)
                .join(" ");

              const planetStyle: CSSProperties = {
                width: `${p.sizePx}px`,
                height: `${p.sizePx}px`,
                marginLeft: `${-p.sizePx / 2}px`,
                background: `var(${p.colorToken})`,
                transform: planetTransform(p.angleDeg),
              };

              return (
                <button
                  key={p.id}
                  type="button"
                  className={planetClasses}
                  style={planetStyle}
                  onClick={() => onPlanetClick(p.id)}
                  aria-label={`${p.role} at ${p.label}, ${p.status}`}
                  data-orrery-planet={p.id}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
