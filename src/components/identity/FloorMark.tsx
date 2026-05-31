"use client";

import type { CSSProperties, JSX } from "react";
import { useEffect, useId, useRef } from "react";

import { gsap } from "@/lib/gsap-init";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getFloor, type FloorId } from "@/lib/config/floors.config";
import "@/styles/floor-mark.css";

/**
 * The LOCKED keystone geometry (docs/MARK-SPEC.md §1.1). The gold body is one
 * evenodd compound path (the doorway is a TRUE cut); the light is one path.
 * Exported so tests, the favicon pipeline, and the gallery share one source.
 */
export const KEYSTONE_VIEWBOX = "0 0 120 120";
export const KEYSTONE_BODY_PATH =
  "M43.7 25.6Q44.1 23.4 46.4 23.4L73.6 23.4Q75.9 23.4 76.3 25.6L95.9 91.2Q96.6 93.6 94.1 93.6L70.8 93.6Q70.8 73 70.6 70.4Q69.6 56.4 60 56.4Q50.4 56.4 49.4 70.4Q49.2 73 49.2 93.6L25.9 93.6Q23.4 93.6 24.1 91.2Z";
export const KEYSTONE_LIGHT_PATH =
  "M60 63.4Q65.2 64 65.2 75.6L65.2 93.6L54.8 93.6L54.8 75.6Q54.8 64 60 63.4Z";

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
 * FloorMark — The Tower's identity mark: a matte-gold Art-Deco keystone with an
 * ascending passage cut as true negative space and a cream "soul" light that
 * breathes. One locked silhouette; floors vary only the light's accent.
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
        A gold keystone — the cap-stone of the climb — with a lit passage you enter.
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
        cy="26"
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
