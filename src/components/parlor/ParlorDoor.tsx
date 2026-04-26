"use client";

import type { JSX } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";

import { gsap } from "@/lib/gsap-init";
import "@/styles/parlor.css";

interface ParlorDoorProps {
  /**
   * True only on the very first render after an offer parses — drives the
   * 2.3s cinematic materialization beat. After the beat completes the
   * preference latch flips (`parlorDoorSeen = true`) and subsequent
   * renders arrive with `firstAppearance=false` for a plain static render.
   */
  firstAppearance: boolean;
  /**
   * Fired once the first-appearance animation (or the reduced-motion fade)
   * completes. The caller persists the `parlorDoorSeen` latch so the next
   * visit skips the animation entirely.
   */
  onFirstAppearanceDone?: () => void;
}

/** Full-path materialization duration (seam → outline → wood → handle). */
const FIRST_APPEARANCE_MS = 2300;
/** Reduced-motion fade duration before we fire the done callback. */
const REDUCED_MOTION_FADE_MS = 200;

/**
 * Feature-detect the reduced-motion preference. SSR-safe via the
 * `window` guard — happy-dom / node environments without matchMedia
 * fall through to `false`.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * The door on the C-Suite wall that leads to the Negotiation Parlor.
 *
 * ABSENT from the DOM when the user has zero offers. That invariant is
 * enforced upstream by `c-suite/page.tsx` (only renders ParlorDoor when
 * `offerCount > 0`) and locked in
 * `src/app/__tests__/r10-parlor-door-absence.proof.test.tsx`.
 *
 * Animation contract:
 *   - `firstAppearance=true` + full motion → 2.3s GSAP timeline
 *     (seam / outline / wood / handle), then fires onFirstAppearanceDone.
 *   - `firstAppearance=true` + reduced motion → 200ms fade, then
 *     fires onFirstAppearanceDone.
 *   - `firstAppearance=false` → plain static render; no animation, no
 *     callback.
 */
export function ParlorDoor({
  firstAppearance,
  onFirstAppearanceDone,
}: ParlorDoorProps): JSX.Element {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!firstAppearance) return;
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion()) {
      const id = window.setTimeout(() => {
        onFirstAppearanceDone?.();
      }, REDUCED_MOTION_FADE_MS);
      return () => window.clearTimeout(id);
    }

    const tl = gsap.timeline({
      onComplete: () => {
        onFirstAppearanceDone?.();
      },
    });
    const seam = node.querySelector<HTMLElement>("[data-seam]");
    const outline = node.querySelector<HTMLElement>("[data-outline]");
    const wood = node.querySelector<HTMLElement>("[data-wood]");
    const handle = node.querySelector<HTMLElement>("[data-handle]");

    // Beat 1 — vertical seam unzips from the top (0.40s).
    if (seam) {
      tl.from(seam, {
        opacity: 0,
        scaleY: 0,
        duration: 0.4,
        ease: "power2.inOut",
      });
    }
    // Beat 2 — gold outline draws from left (0.50s).
    if (outline) {
      tl.from(outline, {
        opacity: 0,
        scaleX: 0,
        duration: 0.5,
        ease: "power2.inOut",
      });
    }
    // Beat 3 — wood grain fades in (0.50s).
    if (wood) {
      tl.from(wood, {
        opacity: 0,
        duration: 0.5,
        ease: "power1.inOut",
      });
    }
    // Beat 4 — brass handle pops (0.40s, back.out for tactile finish).
    if (handle) {
      tl.from(handle, {
        opacity: 0,
        scale: 0.6,
        duration: 0.4,
        ease: "back.out(2)",
      });
    }

    return () => {
      tl.kill();
    };
  }, [firstAppearance, onFirstAppearanceDone]);

  return (
    <Link
      href="/parlor"
      ref={ref}
      aria-label="Enter the Negotiation Parlor"
      data-parlor-door="true"
      data-first-appearance={firstAppearance ? "true" : "false"}
      data-animation-ms={FIRST_APPEARANCE_MS}
      className="parlor-door"
    >
      <span data-seam className="parlor-door-seam" aria-hidden="true" />
      <span data-outline className="parlor-door-outline" aria-hidden="true" />
      <span data-wood className="parlor-door-wood" aria-hidden="true" />
      <span data-handle className="parlor-door-handle" aria-hidden="true" />
      <span className="sr-only">Negotiation Parlor</span>
    </Link>
  );
}
