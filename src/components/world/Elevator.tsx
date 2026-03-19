"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { FLOORS, type FloorId, type ElevatorState } from "@/types/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Ordered floor IDs from top to bottom (matches physical building) */
const FLOOR_ORDER: FloorId[] = ["PH", "7", "6", "5", "4", "3", "2", "1", "L"];

/** Map route → floorId for active detection */
const ROUTE_TO_FLOOR: Record<string, FloorId> = Object.fromEntries(
  FLOORS.map((f) => [f.route, f.id]),
) as Record<string, FloorId>;

/**
 * Elevator — persistent left-side navigation with GSAP door transitions.
 *
 * Features:
 * - Heavier glass panel: rgba(10, 12, 25, 0.85) with blur(20px) + gold left edge
 * - Active floor: stronger glow shadow
 * - Inactive hover: gold ring border
 * - Floor name tooltip via title attribute
 * - Richer door gradient with brushed-metal repeating-linear-gradient texture
 * - Floor counter at text-6xl for legibility
 * - Ambient sound reference: door close/open SFX would hook here
 */
export function Elevator(): JSX.Element {
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
  const darkWashRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const tickTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Determine active floor from pathname
  const activeFloor: FloorId = (() => {
    const match = Object.entries(ROUTE_TO_FLOOR).find(([route]) =>
      pathname.startsWith(route),
    );
    return match ? match[1] : "PH";
  })();

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
   * Ambient sound hook points:
   *   - Door close SFX: play at Phase 1 start (tl.to leftDoor/rightDoor)
   *   - Movement hum SFX: play during Phase 2 (.to interior opacity 1)
   *   - Door open SFX: play at Phase 3 start (.to leftDoor xPercent -100)
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

    // Phase 1: Dark wash fade in + Doors close (400ms)
    // [SOUND] elevator-door-close.mp3 would trigger here
    tl.set(leftDoor, { xPercent: -100 })
      .set(rightDoor, { xPercent: 100 })
      .set(interior, { opacity: 0 })
      .set(darkWash, { opacity: 0 })
      // Dark wash starts slightly before doors for a cinematic feel
      .to(darkWash, { opacity: 0.6, duration: 0.3, ease: "power2.in" })
      .to(leftDoor, { xPercent: 0, duration: 0.4, ease: "power2.in" }, "-=0.2")
      .to(rightDoor, { xPercent: 0, duration: 0.4, ease: "power2.in" }, "<")
      .call(() => setState("moving"))

      // Phase 2: Show interior + counter (500ms)
      // [SOUND] elevator-hum.mp3 would start looping here
      .to(interior, { opacity: 1, duration: 0.15, ease: "power1.in" })
      .call(() => {
        // Animate floor counter
        tickTimersRef.current.forEach(clearTimeout);
        tickTimersRef.current = [];
        const tickDuration = 0.4 / Math.max(sequence.length - 1, 1);
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
      .to({}, { duration: 0.5 })
      .call(() => setState("doors-opening"))

      // Phase 3: Doors open + dark wash fade out (400ms)
      // [SOUND] elevator-door-open.mp3 would trigger here, hum.mp3 stops
      .to(interior, { opacity: 0, duration: 0.1, ease: "power1.out" })
      .to(leftDoor, { xPercent: -100, duration: 0.4, ease: "power2.out" })
      .to(rightDoor, { xPercent: 100, duration: 0.4, ease: "power2.out" }, "<")
      .to(darkWash, { opacity: 0, duration: 0.4, ease: "power2.out" }, "<");

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
        <div
          className="rounded-2xl py-3 px-2 flex flex-col items-center gap-1.5"
          style={{
            background: "rgba(10, 12, 25, 0.85)",
            backdropFilter: "blur(20px) saturate(1.5)",
            WebkitBackdropFilter: "blur(20px) saturate(1.5)",
            borderTop: "1px solid rgba(201, 168, 76, 0.12)",
            borderRight: "1px solid rgba(201, 168, 76, 0.08)",
            borderBottom: "1px solid rgba(201, 168, 76, 0.08)",
            borderLeft: "1px solid rgba(201, 168, 76, 0.15)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
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
                title={`${floor.name} — ${floor.label}`}
                aria-label={`${floor.name} — ${floor.label}`}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "relative w-9 h-9 rounded-full flex items-center justify-center",
                  "text-data text-xs font-medium transition-all duration-200",
                  "focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-2",
                  isLobby ? "mt-2" : "",
                  isTransitioning ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  isActive
                    ? {
                        background: "var(--gold)",
                        color: "var(--tower-darkest)",
                        boxShadow:
                          "0 0 16px rgba(201, 168, 76, 0.5), 0 0 32px rgba(201, 168, 76, 0.2)",
                      }
                    : isLobby
                    ? {
                        color: "var(--text-secondary)",
                        border: "1px dashed rgba(201, 168, 76, 0.2)",
                      }
                    : {
                        color: "var(--text-secondary)",
                      }
                }
                onMouseEnter={(e) => {
                  if (!isActive && !isTransitioning) {
                    (e.currentTarget as HTMLButtonElement).style.border =
                      "1px solid rgba(201, 168, 76, 0.3)";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "var(--text-primary)";
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(201, 168, 76, 0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !isTransitioning) {
                    (e.currentTarget as HTMLButtonElement).style.border = isLobby
                      ? "1px dashed rgba(201, 168, 76, 0.2)"
                      : "";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "var(--text-secondary)";
                    (e.currentTarget as HTMLButtonElement).style.background = "";
                  }
                }}
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

      {/* ── Dark Wash (between floors effect) ── */}
      <div
        ref={darkWashRef}
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 34,
          backgroundColor: "rgba(10, 10, 20, 0.6)",
          opacity: 0,
        }}
        aria-hidden="true"
      />

      {/* ── Transition Overlay ── */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[35] pointer-events-none"
        style={{ display: "none" }}
        aria-hidden="true"
      >
        {/* Left door — brushed metal gradient with vertical texture */}
        <div
          ref={leftDoorRef}
          className="absolute top-0 bottom-0 left-0 w-1/2"
          style={{
            background:
              "linear-gradient(135deg, #2E2848 0%, #221F3A 35%, #1A1730 65%, #141228 100%)",
            borderRight: "1px solid rgba(201, 168, 76, 0.25)",
            transform: "translateX(-100%)",
          }}
        >
          {/* Brushed metal vertical texture */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.012) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.008) 3px, transparent 4px)",
              backgroundSize: "4px 100%",
            }}
            aria-hidden="true"
          />
          {/* Subtle vertical highlight on inner edge */}
          <div
            className="absolute top-0 bottom-0 right-0 w-4"
            style={{
              background:
                "linear-gradient(to left, rgba(201, 168, 76, 0.06), transparent)",
            }}
            aria-hidden="true"
          />
        </div>

        {/* Right door — brushed metal gradient with vertical texture */}
        <div
          ref={rightDoorRef}
          className="absolute top-0 bottom-0 right-0 w-1/2"
          style={{
            background:
              "linear-gradient(225deg, #2E2848 0%, #221F3A 35%, #1A1730 65%, #141228 100%)",
            borderLeft: "1px solid rgba(201, 168, 76, 0.25)",
            transform: "translateX(100%)",
          }}
        >
          {/* Brushed metal vertical texture */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.012) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.008) 3px, transparent 4px)",
              backgroundSize: "4px 100%",
            }}
            aria-hidden="true"
          />
          {/* Subtle vertical highlight on inner edge */}
          <div
            className="absolute top-0 bottom-0 left-0 w-4"
            style={{
              background:
                "linear-gradient(to right, rgba(201, 168, 76, 0.06), transparent)",
            }}
            aria-hidden="true"
          />
        </div>

        {/* Interior (visible during movement) */}
        <div
          ref={interiorRef}
          className="absolute inset-0 flex flex-col items-center justify-center opacity-0"
          style={{
            background:
              "linear-gradient(180deg, #1E1B35 0%, #16132C 45%, #100E22 75%, #0C0A1C 100%)",
          }}
        >
          {/* Brushed metal interior texture */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.014) 0px, transparent 1px, transparent 3px, rgba(255,255,255,0.007) 4px, transparent 5px)",
              backgroundSize: "5px 100%",
              opacity: 0.6,
            }}
            aria-hidden="true"
          />

          {/* Gold trim lines */}
          <div className="absolute top-0 left-0 right-0 h-px bg-[var(--gold)] opacity-35" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--gold)] opacity-35" aria-hidden="true" />
          <div className="absolute top-0 bottom-0 left-0 w-px bg-[var(--gold)] opacity-25" aria-hidden="true" />
          <div className="absolute top-0 bottom-0 right-0 w-px bg-[var(--gold)] opacity-25" aria-hidden="true" />

          {/* Corner accents */}
          <div
            className="absolute top-0 left-0 w-8 h-8"
            style={{ borderTop: "2px solid rgba(201,168,76,0.3)", borderLeft: "2px solid rgba(201,168,76,0.3)" }}
            aria-hidden="true"
          />
          <div
            className="absolute top-0 right-0 w-8 h-8"
            style={{ borderTop: "2px solid rgba(201,168,76,0.3)", borderRight: "2px solid rgba(201,168,76,0.3)" }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 w-8 h-8"
            style={{ borderBottom: "2px solid rgba(201,168,76,0.3)", borderLeft: "2px solid rgba(201,168,76,0.3)" }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 right-0 w-8 h-8"
            style={{ borderBottom: "2px solid rgba(201,168,76,0.3)", borderRight: "2px solid rgba(201,168,76,0.3)" }}
            aria-hidden="true"
          />

          {/* Floor counter */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div
              className="text-data text-xs tracking-[0.3em] uppercase"
              style={{ color: "var(--text-muted)" }}
            >
              Floor
            </div>
            <span
              ref={counterRef}
              className="text-data text-6xl tracking-wider"
              style={{
                color: "var(--gold)",
                textShadow: "0 0 24px rgba(201,168,76,0.4)",
              }}
            >
              {activeFloor === "PH" ? "PH" : activeFloor}
            </span>
            <div
              className="h-px w-14 opacity-50"
              style={{ background: "var(--gold)" }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </>
  );
}
