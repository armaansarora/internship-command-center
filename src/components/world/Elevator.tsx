"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { FLOORS, type FloorId, type ElevatorState } from "@/types/ui";

/** Hook: safe access to reduced motion preference (SSR-safe). */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/** Ordered floor IDs from top to bottom (matches physical building) */
const FLOOR_ORDER: FloorId[] = ["PH", "7", "6", "5", "4", "3", "2", "1", "L"];

/** Map route → floorId for active detection */
const ROUTE_TO_FLOOR: Record<string, FloorId> = Object.fromEntries(
  FLOORS.map((f) => [f.route, f.id]),
) as Record<string, FloorId>;

/**
 * Elevator — persistent left-side navigation with GSAP door transitions.
 *
 * Panel: always-visible floor buttons.
 * Transition: full-screen overlay (doors close → counter → doors open).
 */
export function Elevator() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<ElevatorState>("idle");
  const [targetFloor, setTargetFloor] = useState<FloorId | null>(null);

  // Refs for GSAP targets
  const overlayRef = useRef<HTMLDivElement>(null);
  const leftDoorRef = useRef<HTMLDivElement>(null);
  const rightDoorRef = useRef<HTMLDivElement>(null);
  const interiorRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const tickTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Determine active floor from pathname
  const activeFloor: FloorId = (() => {
    const match = Object.entries(ROUTE_TO_FLOOR).find(([route]) =>
      pathname.startsWith(route),
    );
    return match ? match[1] : "PH";
  })();

  // Check reduced motion preference (SSR-safe hook)
  const prefersReducedMotion = useReducedMotion();

  /**
   * Get intermediate floors for the counter animation.
   */
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

  /**
   * Navigate to a floor with elevator animation.
   */
  const navigateToFloor = useCallback(
    (floorId: FloorId) => {
      if (state !== "idle" || floorId === activeFloor) return;

      // Lobby = exit the building (no transition)
      if (floorId === "L") {
        router.push("/lobby");
        return;
      }

      const floor = FLOORS.find((f) => f.id === floorId);
      if (!floor) return;

      // Reduced motion: navigate immediately
      if (prefersReducedMotion) {
        router.push(floor.route);
        return;
      }

      setTargetFloor(floorId);
      setState("doors-closing");
    },
    [state, activeFloor, router, prefersReducedMotion],
  );

  /**
   * GSAP transition sequence.
   */
  useEffect(() => {
    if (state !== "doors-closing" || !targetFloor) return;

    const overlay = overlayRef.current;
    const leftDoor = leftDoorRef.current;
    const rightDoor = rightDoorRef.current;
    const interior = interiorRef.current;
    const counter = counterRef.current;

    if (!overlay || !leftDoor || !rightDoor || !interior || !counter) return;

    const floor = FLOORS.find((f) => f.id === targetFloor);
    if (!floor) return;

    const sequence = getFloorSequence(activeFloor, targetFloor);

    // Make overlay visible
    overlay.style.display = "block";

    const tl = gsap.timeline({
      onComplete: () => {
        setState("idle");
        setTargetFloor(null);
        if (overlay) overlay.style.display = "none";
      },
    });

    timelineRef.current = tl;

    // Phase 1: Doors close (400ms)
    tl.set(leftDoor, { xPercent: -100 })
      .set(rightDoor, { xPercent: 100 })
      .set(interior, { opacity: 0 })
      .to(leftDoor, { xPercent: 0, duration: 0.4, ease: "power2.in" })
      .to(
        rightDoor,
        { xPercent: 0, duration: 0.4, ease: "power2.in" },
        "<",
      )
      .call(() => setState("moving"))

      // Phase 2: Show interior + counter (600ms)
      .to(interior, { opacity: 1, duration: 0.15 })
      .call(() => {
        // Animate floor counter — tracked timeouts for cleanup
        tickTimersRef.current.forEach(clearTimeout);
        tickTimersRef.current = [];
        const tickDuration = 0.5 / Math.max(sequence.length - 1, 1);
        sequence.forEach((fId, i) => {
          const timer = setTimeout(() => {
            if (counter) {
              counter.textContent = fId === "PH" ? "PH" : fId;
            }
          }, i * tickDuration * 1000);
          tickTimersRef.current.push(timer);
        });

        // Navigate during doors-closed phase
        router.push(floor.route);
      })
      .to({}, { duration: 0.6 })
      .call(() => setState("doors-opening"))

      // Phase 3: Doors open (400ms)
      .to(interior, { opacity: 0, duration: 0.1 })
      .to(leftDoor, { xPercent: -100, duration: 0.4, ease: "power2.out" })
      .to(
        rightDoor,
        { xPercent: 100, duration: 0.4, ease: "power2.out" },
        "<",
      );

    return () => {
      tl.kill();
      tickTimersRef.current.forEach(clearTimeout);
      tickTimersRef.current = [];
    };
  }, [state, targetFloor, activeFloor, getFloorSequence, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
      tickTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  const isTransitioning = state !== "idle";

  return (
    <>
      {/* ── Elevator Panel (always visible on left) ── */}
      <nav
        className="fixed left-0 top-0 bottom-0 z-[30] hidden md:flex flex-col items-center justify-center w-16 gap-1 py-4"
        aria-label="Floor navigation"
      >
        <div className="glass rounded-full py-3 px-2 flex flex-col items-center gap-1.5">
          {FLOOR_ORDER.map((floorId) => {
            const floor = FLOORS.find((f) => f.id === floorId);
            if (!floor) return null;
            const isActive = floorId === activeFloor;
            const isLobby = floorId === "L";

            return (
              <button
                key={floorId}
                onClick={() => navigateToFloor(floorId)}
                disabled={isTransitioning || isActive}
                aria-label={`${floor.name} — ${floor.label}`}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "relative w-9 h-9 rounded-full flex items-center justify-center",
                  "text-data text-xs font-medium transition-all duration-200",
                  "focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-2",
                  isActive
                    ? "bg-[var(--gold)] text-[var(--tower-darkest)] shadow-[0_0_12px_rgba(201,168,76,0.4)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]",
                  isLobby ? "mt-2 border border-dashed border-[var(--glass-border)]" : "",
                  isTransitioning ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {floorId === "PH" ? (
                  <span className="text-[10px] leading-none">PH</span>
                ) : (
                  floorId
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Transition Overlay ── */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[35] pointer-events-none"
        style={{ display: "none" }}
        aria-hidden="true"
      >
        {/* Left door */}
        <div
          ref={leftDoorRef}
          className="absolute top-0 bottom-0 left-0 w-1/2"
          style={{
            background:
              "linear-gradient(135deg, #2A2540 0%, #1E1B33 40%, #16132A 100%)",
            borderRight: "1px solid var(--gold-dim)",
            transform: "translateX(-100%)",
          }}
        />

        {/* Right door */}
        <div
          ref={rightDoorRef}
          className="absolute top-0 bottom-0 right-0 w-1/2"
          style={{
            background:
              "linear-gradient(225deg, #2A2540 0%, #1E1B33 40%, #16132A 100%)",
            borderLeft: "1px solid var(--gold-dim)",
            transform: "translateX(100%)",
          }}
        />

        {/* Interior (visible during movement) */}
        <div
          ref={interiorRef}
          className="absolute inset-0 flex flex-col items-center justify-center opacity-0"
          style={{
            background:
              "linear-gradient(180deg, #1A1730 0%, #14122A 50%, #0F0D20 100%)",
          }}
        >
          {/* Brushed metal texture */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, var(--gold) 0px, transparent 1px, transparent 3px)",
              backgroundSize: "4px 100%",
            }}
          />

          {/* Gold trim lines */}
          <div className="absolute top-0 left-0 right-0 h-px bg-[var(--gold)] opacity-30" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--gold)] opacity-30" />
          <div className="absolute top-0 bottom-0 left-0 w-px bg-[var(--gold)] opacity-20" />
          <div className="absolute top-0 bottom-0 right-0 w-px bg-[var(--gold)] opacity-20" />

          {/* Floor counter */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="text-data text-xs text-[var(--text-muted)] tracking-[0.3em] uppercase">
              Floor
            </div>
            <span
              ref={counterRef}
              className="text-data text-5xl text-[var(--gold)] tracking-wider"
            >
              {activeFloor === "PH" ? "PH" : activeFloor}
            </span>
            <div className="h-px w-12 bg-[var(--gold)] opacity-40" />
          </div>
        </div>
      </div>
    </>
  );
}
