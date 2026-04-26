"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { gsap } from "@/lib/gsap-init";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ProceduralSkyline } from "@/components/world/ProceduralSkyline";
import { LobbyBackground } from "@/components/world/LobbyBackground";
import {
  STAGES,
  reducedMotionStages,
  totalDurationMs,
  type ArrivalStage,
} from "./ArrivalStages";

/**
 * CinematicArrival.
 *
 * One-time-per-account aerial-approach cinematic. Composed over the existing
 * world primitives (ProceduralSkyline as the far background, LobbyBackground
 * as the near reception plate) with a GSAP timeline driving stage transitions.
 *
 * Strict contract:
 *   - If `arrivalAlreadyPlayed === true` → returns null immediately. No DOM,
 *     no timers, no side effects. The server-side `claimArrivalPlay` helper
 *     (R4.3) is the source of truth; this is the component-level gate that
 *     refuses to mount even if that boolean somehow flips mid-render.
 *   - Skip button is always rendered (when not already-played) and always
 *     honored — clicking it fires `onSkip()` and the parent tears down.
 *   - `onComplete()` fires after the last stage finishes naturally.
 *   - Under `prefers-reduced-motion`, the whole thing collapses to a single
 *     0-duration stage that fires `onComplete` on mount. The audience never
 *     sees a motion cue they asked the OS to suppress.
 *   - Total duration ≤ 8s (enforced by ArrivalStages test).
 *
 * Design-doc anchors: §1.1 (CSS + GSAP), §1.6 (one-time-per-account strict).
 */

export interface CinematicArrivalProps {
  arrivalAlreadyPlayed: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function CinematicArrival({
  arrivalAlreadyPlayed,
  onComplete,
  onSkip,
}: CinematicArrivalProps): JSX.Element | null {
  // Component-level guard — strict one-time enforcement.
  // Early-return BEFORE any hooks are called so we never violate rules-of-hooks
  // when the parent swaps this prop between renders (e.g. after completion).
  if (arrivalAlreadyPlayed) {
    return null;
  }

  return <CinematicArrivalInner onComplete={onComplete} onSkip={onSkip} />;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Inner component — only mounted when the cinematic actually plays.        */
/* Split out so the hooks here only run in the not-yet-played path and the  */
/* outer guard can be a clean, hookless early return.                       */
/* ──────────────────────────────────────────────────────────────────────── */

interface InnerProps {
  onComplete: () => void;
  onSkip: () => void;
}

function CinematicArrivalInner({ onComplete, onSkip }: InnerProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const skylineLayerRef = useRef<HTMLDivElement>(null);
  const lobbyLayerRef = useRef<HTMLDivElement>(null);
  const deskLightRef = useRef<HTMLDivElement>(null);
  const hasCompleted = useRef(false);

  const stages: readonly ArrivalStage[] = reducedMotion
    ? reducedMotionStages()
    : STAGES;
  const [activeStageId, setActiveStageId] = useState<string>(stages[0]?.id ?? "");

  const fireCompleteOnce = useCallback(() => {
    if (hasCompleted.current) return;
    hasCompleted.current = true;
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    // Skip is always honored, even before the timeline has started.
    // Parent tears down; we do NOT fire onComplete here.
    onSkip();
  }, [onSkip]);

  /* Reduced-motion path: fire onComplete on mount, skip the timeline. */
  useEffect(() => {
    if (!reducedMotion) return;
    fireCompleteOnce();
  }, [reducedMotion, fireCompleteOnce]);

  /* Motion path: build a GSAP timeline that walks the stage sequence. */
  useEffect(() => {
    if (reducedMotion) return;
    if (hasCompleted.current) return;

    const skylineEl = skylineLayerRef.current;
    const lobbyEl = lobbyLayerRef.current;
    const deskEl = deskLightRef.current;
    if (!skylineEl || !lobbyEl || !deskEl) return;

    // Initial positions — far aerial approach, lobby dim, desk dark.
    gsap.set(skylineEl, { scale: 1.35, opacity: 0.45, filter: "blur(2px)" });
    gsap.set(lobbyEl, { opacity: 0, scale: 1.04 });
    gsap.set(deskEl, { opacity: 0 });

    const tl = gsap.timeline({
      onComplete: () => {
        fireCompleteOnce();
      },
    });

    // Stage 1: approach — skyline settles, blur releases.
    const approach = STAGES.find((s) => s.id === "approach");
    if (approach) {
      tl.add(() => setActiveStageId("approach"));
      tl.to(skylineEl, {
        scale: 1.08,
        opacity: 0.85,
        filter: "blur(0px)",
        duration: approach.durationMs / 1000,
        ease: approach.easing,
      });
    }

    // Stage 2: pan-down — faint vertical drift suggesting a tilt downward.
    const panDown = STAGES.find((s) => s.id === "pan-down");
    if (panDown) {
      tl.add(() => setActiveStageId("pan-down"));
      tl.to(
        skylineEl,
        {
          scale: 1.0,
          y: "3%",
          duration: panDown.durationMs / 1000,
          ease: panDown.easing,
        },
        "<",
      );
    }

    // Stage 3: lobby fade-in — interior plate blooms over the skyline.
    const lobbyFade = STAGES.find((s) => s.id === "lobby-fade-in");
    if (lobbyFade) {
      tl.add(() => setActiveStageId("lobby-fade-in"));
      tl.to(lobbyEl, {
        opacity: 1,
        scale: 1,
        duration: lobbyFade.durationMs / 1000,
        ease: lobbyFade.easing,
      });
      // Pull the skyline back softly so the attention lands on the interior.
      tl.to(
        skylineEl,
        {
          opacity: 0.35,
          duration: lobbyFade.durationMs / 1000,
          ease: lobbyFade.easing,
        },
        "<",
      );
    }

    // Stage 4: concierge-land — warm light lands on the desk area.
    const conciergeLand = STAGES.find((s) => s.id === "concierge-land");
    if (conciergeLand) {
      tl.add(() => setActiveStageId("concierge-land"));
      tl.to(deskEl, {
        opacity: 1,
        duration: conciergeLand.durationMs / 1000,
        ease: conciergeLand.easing,
      });
    }

    return () => {
      tl.kill();
    };
  }, [reducedMotion, fireCompleteOnce]);

  // Total duration is advertised to the a11y layer so assistive tech knows
  // how long the overlay will be present.
  const duration = totalDurationMs(stages);

  return (
    <div
      ref={rootRef}
      data-cinematic="arrival"
      data-stage={activeStageId}
      role="dialog"
      aria-label="Arriving at the Tower"
      aria-live="polite"
      className="fixed inset-0 overflow-hidden"
      style={{
        zIndex: 95,
        backgroundColor: "#05060D",
      }}
    >
      {/* FAR BACKGROUND — Procedural skyline, massively scaled at start. */}
      <div
        ref={skylineLayerRef}
        className="absolute inset-0"
        style={{
          zIndex: 1,
          willChange: "transform, opacity, filter",
          transformOrigin: "center center",
        }}
      >
        <ProceduralSkyline floorId="L" />
      </div>

      {/* NEAR BACKGROUND — Luxury reception Ken Burns. Fades in mid-sequence. */}
      <div
        ref={lobbyLayerRef}
        className="absolute inset-0"
        style={{
          zIndex: 2,
          willChange: "transform, opacity",
          transformOrigin: "center center",
        }}
      >
        <LobbyBackground />
      </div>

      {/* FINAL BEAT — Warm desk spotlight. Burgundy-tinted so the last note
          hints at Otis without depending on his primitives. */}
      <div
        ref={deskLightRef}
        className="absolute inset-x-0"
        style={{
          bottom: 0,
          height: "55%",
          zIndex: 3,
          willChange: "opacity",
          background:
            "radial-gradient(ellipse 42% 65% at 50% 90%, rgba(107, 42, 46, 0.28) 0%, rgba(107, 42, 46, 0.08) 45%, transparent 75%)",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      {/* Invisible duration announcement for screen readers. */}
      <span className="sr-only" aria-hidden="false">
        Cinematic arrival, approximately {Math.ceil(duration / 1000)} seconds.
        Press Skip to continue immediately.
      </span>

      {/* SKIP BUTTON — always rendered, top-right, always honored. */}
      <button
        type="button"
        onClick={handleSkip}
        data-action="skip-cinematic"
        aria-label="Skip the arrival cinematic"
        className="absolute top-6 right-6 rounded-md px-4 py-2 text-xs font-mono uppercase tracking-widest border transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          zIndex: 10,
          color: "rgba(255,255,255,0.78)",
          borderColor: "rgba(255,255,255,0.28)",
          backgroundColor: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        Skip
      </button>
    </div>
  );
}
