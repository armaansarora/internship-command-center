"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "@/lib/gsap-init";
import { FLOORS, FLOOR_ORDER, ROUTE_TO_FLOOR, type FloorId } from "@/lib/constants/floors";
import type { ElevatorState } from "@/types/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ElevatorPanel, ElevatorMobileBar } from "./elevator/ElevatorPanel";
import { ElevatorDoors } from "./elevator/ElevatorDoors";

// ─── SessionStorage key ──────────────────────────────────────────────────────
/**
 * When navigating between lobby ↔ authenticated pages the Elevator unmounts on
 * one side and remounts on the other.  This flag tells the arriving Elevator to
 * play the "doors opening" animation instead of starting idle.
 */
const ELEVATOR_ARRIVING_KEY = "elevator-arriving";

// ─── Keyframe styles injected once ──────────────────────────────────────────
const ELEVATOR_STYLES = `
@keyframes elevator-active-pulse {
  0%, 100% {
    box-shadow:
      0 0 0 0px rgba(201, 168, 76, 0),
      0 0 16px rgba(201, 168, 76, 0.5),
      0 0 32px rgba(201, 168, 76, 0.2);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 0 3px rgba(201, 168, 76, 0.35),
      0 0 24px rgba(201, 168, 76, 0.7),
      0 0 48px rgba(201, 168, 76, 0.3);
    transform: scale(1.05);
  }
}

@keyframes elevator-cable-shimmer {
  0%   { background-position: 0% 200%; }
  50%  { background-position: 0% 0%;   }
  100% { background-position: 0% 200%; }
}

@keyframes elevator-door-reflect {
  0%   { transform: translateX(-120%) skewX(-8deg); opacity: 0; }
  15%  { opacity: 0.8; }
  85%  { opacity: 0.8; }
  100% { transform: translateX(220%) skewX(-8deg); opacity: 0; }
}

.elevator-active-btn {
  animation: elevator-active-pulse 2s ease-in-out infinite;
}

.elevator-cable {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(201, 168, 76, 0.6) 30%,
    rgba(201, 168, 76, 1)   50%,
    rgba(201, 168, 76, 0.6) 70%,
    rgba(201, 168, 76, 0.9) 100%
  );
  background-size: 100% 300%;
  animation: elevator-cable-shimmer 3s ease-in-out infinite;
}

.door-reflect {
  animation: elevator-door-reflect 1.4s ease-in-out infinite;
}

/* Tooltip system */
.elevator-btn-wrap {
  position: relative;
}
.elevator-tooltip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms ease, transform 150ms ease;
  transform: translateY(-50%) translateX(-4px);
  z-index: 50;
}
.elevator-btn-wrap:hover .elevator-tooltip {
  opacity: 1;
  transform: translateY(-50%) translateX(0px);
}
`;

/**
 * Elevator — persistent left-side navigation with GSAP door transitions.
 *
 * Responsibilities of this orchestrator:
 * - GSAP timeline management (doors-closing → moving → doors-opening)
 * - Navigation state machine (idle | doors-closing | moving | doors-opening)
 * - SessionStorage arriving-flag coordination (cross-route transitions)
 * - Custom `elevator:navigate` event listener
 * - Composition of ElevatorPanel, ElevatorMobileBar, ElevatorDoors
 */
export function Elevator(): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<ElevatorState>("idle");
  const [targetFloor, setTargetFloor] = useState<FloorId | null>(null);

  // ── Refs for GSAP targets ──────────────────────────────────────────────────
  const overlayRef = useRef<HTMLDivElement>(null);
  const leftDoorRef = useRef<HTMLDivElement>(null);
  const rightDoorRef = useRef<HTMLDivElement>(null);
  const interiorRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const darkWashRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const tickTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const prefersReducedMotion = useReducedMotion();

  // ── Prefetch every floor's route on mount so navigation feels instant ─────
  // Without this, router.push triggers a cold server render AFTER the GSAP
  // animation completes, causing the doors to open onto empty space for the
  // 200-800ms it takes Supabase queries to return. Prefetching warms the
  // route cache so content is ready the moment the doors open.
  useEffect(() => {
    FLOORS.forEach((f) => {
      try {
        router.prefetch(f.route);
      } catch {
        // Prefetch is a best-effort optimisation; failures are silent.
      }
    });
  }, [router]);

  // ── Derive active floor from current pathname ──────────────────────────────
  const activeFloor: FloorId = useMemo(() => {
    const match = Object.entries(ROUTE_TO_FLOOR).find(([route]) =>
      pathname.startsWith(route),
    );
    return match ? match[1] : "PH";
  }, [pathname]);

  const isTransitioning = state !== "idle";

  // ── Floor sequence for counter animation ──────────────────────────────────
  const getFloorSequence = useCallback(
    (from: FloorId, to: FloorId): FloorId[] => {
      const fromIdx = FLOOR_ORDER.indexOf(from);
      const toIdx = FLOOR_ORDER.indexOf(to);
      if (fromIdx === -1 || toIdx === -1) return [to];

      const step = fromIdx < toIdx ? 1 : -1;
      const seq: FloorId[] = [];
      for (let i = fromIdx; i !== toIdx + step; i += step) {
        seq.push(FLOOR_ORDER[i]);
      }
      return seq;
    },
    [],
  );

  // ── Navigate to a floor ────────────────────────────────────────────────────
  const navigateToFloor = useCallback(
    (floorId: FloorId) => {
      if (state !== "idle" || floorId === activeFloor) return;

      const floor = FLOORS.find((f) => f.id === floorId);
      if (!floor) return;

      if (prefersReducedMotion) {
        router.push(floor.route);
        return;
      }

      // flushSync forces React to commit these state updates synchronously,
      // so the GSAP-bound useEffect fires in the same tick as the click
      // handler instead of waiting for the next concurrent-render slot.
      // Without this there is a perceptible 50-100ms pause between the
      // click and the door-close animation starting.
      flushSync(() => {
        setTargetFloor(floorId);
        setState("doors-closing");
      });
    },
    [state, activeFloor, router, prefersReducedMotion],
  );

  // ── On mount: check for arriving flag (cross-route transition) ─────────────
  useEffect(() => {
    try {
      const arriving = sessionStorage.getItem(ELEVATOR_ARRIVING_KEY);
      if (!arriving) return;
      sessionStorage.removeItem(ELEVATOR_ARRIVING_KEY);
    } catch {
      return;
    }

    const overlay = overlayRef.current;
    const leftDoor = leftDoorRef.current;
    const rightDoor = rightDoorRef.current;
    const interior = interiorRef.current;
    const darkWash = darkWashRef.current;
    if (!overlay || !leftDoor || !rightDoor || !interior || !darkWash) return;

    overlay.style.display = "block";
    gsap.set(leftDoor, { xPercent: 0 });
    gsap.set(rightDoor, { xPercent: 0 });
    gsap.set(interior, { opacity: 1 });
    gsap.set(darkWash, { opacity: 0.5 });

    // Cross-route arrival — also gate skyline RAF.
    window.dispatchEvent(new Event("tower:transition:start"));

    const tl = gsap.timeline({
      delay: 0.25,
      onComplete: () => {
        setState("idle");
        if (overlay) overlay.style.display = "none";
        if (darkWash) gsap.set(darkWash, { opacity: 0 });
        window.dispatchEvent(new Event("tower:transition:end"));
      },
    });

    tl.to(interior, { opacity: 0, duration: 0.15, ease: "power1.out" })
      .to(leftDoor, { xPercent: -100, duration: 0.55, ease: "power3.out" })
      .to(rightDoor, { xPercent: 100, duration: 0.55, ease: "power3.out" }, "<")
      .to(darkWash, { opacity: 0, duration: 0.55, ease: "power2.out" }, "<");

    return () => { tl.kill(); };
  }, []);

  // ── GSAP transition sequence ───────────────────────────────────────────────
  /**
   * Three phases:
   *  1. Doors close  (dark wash + sliding door leaves)
   *  2. Moving       (interior visible, floor counter ticks, route changes)
   *  3. Doors open   (only if same Elevator instance survives the navigation)
   */
  useEffect(() => {
    if (state !== "doors-closing" || !targetFloor) return;

    const overlay = overlayRef.current;
    const leftDoor = leftDoorRef.current;
    const rightDoor = rightDoorRef.current;
    const interior = interiorRef.current;
    const counter = counterRef.current;
    const darkWash = darkWashRef.current;
    if (!overlay || !leftDoor || !rightDoor || !interior || !counter || !darkWash) return;

    const floor = FLOORS.find((f) => f.id === targetFloor);
    if (!floor) return;

    // Capture at transition start — do NOT use activeFloor in deps because
    // router.push changes pathname → activeFloor recalcs → effect re-runs → tl.kill()
    const fromFloor = activeFloor;
    const sequence = getFloorSequence(fromFloor, targetFloor);
    const isLobbyTransition = fromFloor === "L" || targetFloor === "L";

    overlay.style.display = "block";

    // Tell other expensive RAF loops (ProceduralSkyline) to pause so they
    // don't compete with this timeline for the main thread.
    window.dispatchEvent(new Event("tower:transition:start"));

    const tl = gsap.timeline({
      onComplete: () => {
        setState("idle");
        setTargetFloor(null);
        if (overlay) overlay.style.display = "none";
        if (darkWash) gsap.set(darkWash, { opacity: 0 });
        window.dispatchEvent(new Event("tower:transition:end"));
      },
    });

    timelineRef.current = tl;

    // Phase 1: Dark wash + doors close
    // Timings deliberately cover the typical page-data-fetch latency
    // (~200-800ms Supabase round-trip) — shortening them exposes the load time.
    tl.set(leftDoor, { xPercent: -100 })
      .set(rightDoor, { xPercent: 100 })
      .set(interior, { opacity: 0 })
      .set(darkWash, { opacity: 0 })
      .to(darkWash, { opacity: 0.5, duration: 0.35, ease: "power2.inOut" })
      .to(leftDoor, { xPercent: 0, duration: 0.5, ease: "power3.inOut" }, "-=0.25")
      .to(rightDoor, { xPercent: 0, duration: 0.5, ease: "power3.inOut" }, "<")
      .call(() => setState("moving"))

      // Phase 2: Interior + counter tick
      .to(interior, { opacity: 1, duration: 0.2, ease: "power1.in" })
      .call(() => {
        tickTimersRef.current.forEach(clearTimeout);
        tickTimersRef.current = [];
        const tickInterval = 400 / Math.max(sequence.length - 1, 1);
        sequence.forEach((fId, i) => {
          const timer = setTimeout(() => {
            if (counter) counter.textContent = fId === "PH" ? "PH" : fId;
          }, i * tickInterval);
          tickTimersRef.current.push(timer);
        });

        if (isLobbyTransition) {
          try { sessionStorage.setItem(ELEVATOR_ARRIVING_KEY, "1"); } catch {}
        }

        // Plain router.push — earlier I tried wrapping this in
        // document.startViewTransition() to crossfade the underlying DOM,
        // but the browser's "keep old DOM painted until new commits"
        // behaviour was leaking the OLD floor through the elevator-doors
        // gap during the doors-opening phase, producing a flash of the
        // previous floor before the new one appeared. The elevator overlay
        // is the only transition we want; the route swap should be a hard
        // cut underneath the closed doors.
        router.push(floor.route);
      })
      .to({}, { duration: 0.6 })
      .call(() => setState("doors-opening"))

      // Phase 3: Doors open (same-instance navigation only)
      .to(interior, { opacity: 0, duration: 0.15, ease: "power1.out" })
      .to(leftDoor, { xPercent: -100, duration: 0.55, ease: "power3.out" })
      .to(rightDoor, { xPercent: 100, duration: 0.55, ease: "power3.out" }, "<")
      .to(darkWash, { opacity: 0, duration: 0.55, ease: "power2.out" }, "<");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, targetFloor]);

  // ── Custom event listener (external navigate requests) ────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ floorId: string }>).detail;
      if (detail?.floorId) {
        navigateToFloor(detail.floorId as FloorId);
      }
    };
    window.addEventListener("elevator:navigate", handler);
    return () => window.removeEventListener("elevator:navigate", handler);
  }, [navigateToFloor]);

  // ── Safety reset: ensure overlay is hidden when back in idle ──────────────
  useEffect(() => {
    if (state === "idle") {
      const overlay = overlayRef.current;
      const darkWash = darkWashRef.current;
      if (overlay) overlay.style.display = "none";
      if (darkWash) gsap.set(darkWash, { opacity: 0 });
    }
  }, [state]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
      tickTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <>
      {/* ── Injected keyframe styles ── */}
      <style>{ELEVATOR_STYLES}</style>

      {/* ══════════════════════════════════════════════════════
          DESKTOP PANEL (md and above, fixed left column)
         ══════════════════════════════════════════════════════ */}
      <div
        className="fixed left-0 top-0 bottom-0 z-[30] hidden md:flex flex-col items-center w-16"
        aria-hidden="false"
      >
        {/* Cable above panel */}
        <div
          className="flex-1 flex flex-col items-center pt-0"
          aria-hidden="true"
          style={{ minHeight: 0 }}
        >
          <div
            className="elevator-cable"
            style={{ width: "1px", height: "100%", minHeight: "8px" }}
          />
        </div>

        <ElevatorPanel
          activeFloor={activeFloor}
          isTransitioning={isTransitioning}
          onNavigate={navigateToFloor}
        />

        {/* Cable below panel */}
        <div
          className="flex-1 flex flex-col items-center"
          aria-hidden="true"
          style={{ minHeight: 0 }}
        >
          <div
            className="elevator-cable"
            style={{ width: "1px", height: "100%", minHeight: "8px", opacity: 0.4 }}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE BOTTOM BAR (below md breakpoint)
         ══════════════════════════════════════════════════════ */}
      <ElevatorMobileBar
        activeFloor={activeFloor}
        isTransitioning={isTransitioning}
        onNavigate={navigateToFloor}
      />

      {/* ══════════════════════════════════════════════════════
          DOOR / OVERLAY ANIMATION ELEMENTS
         ══════════════════════════════════════════════════════ */}
      <ElevatorDoors
        overlayRef={overlayRef}
        leftDoorRef={leftDoorRef}
        rightDoorRef={rightDoorRef}
        interiorRef={interiorRef}
        counterRef={counterRef}
        darkWashRef={darkWashRef}
        activeFloor={activeFloor}
      />
    </>
  );
}
