"use client";

import type { CSSProperties, JSX } from "react";
import { useEffect, useId, useRef } from "react";

import { gsap } from "@/lib/gsap-init";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getFloor, type FloorId } from "@/lib/config/floors.config";
import "@/styles/floor-mark.css";

/**
 * The LOCKED mark geometry (docs/MARK-SPEC.md §1.1): a vertical Art-Deco tower
 * with a keystone cornice cap and a tall lit archway. The gold body is one
 * contour (the archway is a TRUE cut up from the base); the light is one path.
 * Exported so tests, the favicon pipeline, and the gallery share one source.
 */
export const KEYSTONE_VIEWBOX = "0 0 120 120";
// A vertical tower with a squared Art-Deco cornice cap and a tall lit archway.
// Single contour (the archway is a concave notch in the base) — reads as an
// architectural tower at 24px, never as a letter.
export const KEYSTONE_BODY_PATH =
  "M45 96 L45 39 L40 39 L40 30 Q40 28.5 41.5 28.5 L78.5 28.5 Q80 28.5 80 30 L80 39 L75 39 L75 96 L66.5 96 L66.5 67 Q66.5 57 60 57 Q53.5 57 53.5 67 L53.5 96 Z";
export const KEYSTONE_LIGHT_PATH =
  "M60 60 Q65 60.5 65 69 L65 96 L55 96 L55 69 Q55 60.5 60 60 Z";

const MARK_NAVY = "#1A1A2E";
const MARK_GOLD = "#C9A84C";
const MARK_GLOW = "#FBE9B0";

export type FloorMarkState = "idle" | "active" | "notify";

export interface FloorMarkProps {
  /** Which floor's accent tints the soul light. Defaults to the Lobby (cream). */
  floor?: FloorId;
  /** Rendered pixel size (square). Default 120. */
  size?: number;
  /** Render the navy rounded-square app-icon tile behind the glyph. Default false (bare glyph). */
  ground?: boolean;
  /** Motion state. "notify" fires a one-shot ring, then settles to idle. Default "idle". */
  state?: FloorMarkState;
  /** Accessible label. Defaults to the floor name (or "The Tower"). */
  title?: string;
  /** Optional accent override (hex) for the soul light. */
  accent?: string;
  className?: string;
}

/**
 * FloorMark — The Tower's identity mark: a matte-gold Art-Deco tower with a
 * keystone cornice and a lit archway cut as true negative space, and a cream
 * "soul" light that breathes. One locked silhouette; floors vary only the light's accent.
 *
 * Motion (docs/MARK-SPEC.md §3): idle / hover / active live in CSS
 * (`@/styles/floor-mark.css`); the one-shot **notify** ring is GSAP, routed
 * through `@/lib/gsap-init`. All states honor `prefers-reduced-motion` — the
 * mark resolves to a designed, fully-lit still.
 */
export function FloorMark({
  floor = "L",
  size = 120,
  ground = false,
  state = "idle",
  title,
  accent,
  className,
}: FloorMarkProps): JSX.Element {
  const f = getFloor(floor);
  const lightAccent = accent ?? f.accent;
  const label = title ?? (floor === "L" ? "The Tower" : `The Tower — ${f.name}`);

  const reactId = useId();
  const titleId = `${reactId}-fm-title`;
  const descId = `${reactId}-fm-desc`;
  const glowId = `${reactId}-fm-glow`;

  const reduceMotion = useReducedMotion();
  const ringRef = useRef<SVGCircleElement>(null);
  const lightRef = useRef<SVGPathElement>(null);

  // One-shot NOTIFY: a soft gold ring emanates from the apex + a brief light
  // flare, then settles. GSAP timeline (via @/lib/gsap-init), reduced-motion safe.
  useEffect(() => {
    if (state !== "notify") return;
    const ring = ringRef.current;
    const light = lightRef.current;
    if (!ring || !light) return;
    if (reduceMotion) return;

    const tl = gsap.timeline();
    tl.fromTo(
      ring,
      { attr: { r: 4 }, opacity: 0.7 },
      { attr: { r: 30 }, opacity: 0, duration: 0.9, ease: "power2.out" },
      0,
    ).fromTo(
      light,
      { opacity: 0.95 },
      { opacity: 1, duration: 0.18, yoyo: true, repeat: 1, ease: "sine.inOut" },
      0,
    );
    return () => {
      tl.kill();
    };
  }, [state, reduceMotion]);

  // The non-notify states drive CSS via data-state. (notify visuals are the GSAP
  // ring above; the steady silhouette stays in its idle resting motion.)
  const cssState: "idle" | "active" = state === "active" ? "active" : "idle";

  const style = {
    "--fm-accent": lightAccent,
  } as CSSProperties;

  return (
    <svg
      className={["fm", className].filter(Boolean).join(" ")}
      data-state={cssState}
      data-floor={f.id}
      width={size}
      height={size}
      viewBox={KEYSTONE_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      style={style}
    >
      <title id={titleId}>{label}</title>
      <desc id={descId}>
        A gold Art-Deco tower with a keystone cornice and a lit archway you enter.
      </desc>
      <defs>
        <radialGradient id={glowId} cx="60" cy="80" r="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={MARK_GLOW} />
          <stop offset="1" stopColor={MARK_GLOW} stopOpacity="0" />
        </radialGradient>
      </defs>

      {ground ? <rect width="120" height="120" rx="26" fill={MARK_NAVY} /> : null}

      {/* Active/hover welling glow — behind the gold, so it shows only through the doorway. */}
      <ellipse className="fm-halo" cx="60" cy="80" rx="18" ry="24" fill={`url(#${glowId})`} />

      <path className="fm-body" d={KEYSTONE_BODY_PATH} fillRule="evenodd" fill={MARK_GOLD} />
      <path ref={lightRef} className="fm-light" d={KEYSTONE_LIGHT_PATH} fill="var(--fm-accent)" />

      {/* NOTIFY ring — animated by GSAP; inert/invisible at rest. */}
      <circle
        ref={ringRef}
        className="fm-ring"
        cx="60"
        cy="28"
        r="4"
        fill="none"
        stroke={MARK_GOLD}
        strokeWidth="2"
        opacity="0"
        aria-hidden="true"
      />
    </svg>
  );
}
