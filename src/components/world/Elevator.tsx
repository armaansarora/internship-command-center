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

// ─── Inline keyframe styles injected once ──────────────────────────────────
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
 * Features:
 * - Heavier glass panel: rgba(10, 12, 25, 0.85) with blur(20px) + gold left edge
 * - Active floor: pulsing gold ring animation (scale 1→1.05, intensifying box-shadow)
 * - Inactive hover: gold ring border via JS
 * - Floor name tooltip: custom glass panel to the right of each button
 * - "THE TOWER" header with tower SVG icon
 * - Elevator cable: 1px shimmer line above the nav panel
 * - Status indicator: FLOOR [X] + floor name at panel bottom
 * - Door transition: reflection gradient sweeping across closing/opening doors
 * - Mobile bottom-bar: horizontal floor buttons < md breakpoint
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

  const activeFloorData = FLOORS.find((f) => f.id === activeFloor);

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
    tl.set(leftDoor, { xPercent: -100 })
      .set(rightDoor, { xPercent: 100 })
      .set(interior, { opacity: 0 })
      .set(darkWash, { opacity: 0 })
      .to(darkWash, { opacity: 0.6, duration: 0.3, ease: "power2.in" })
      .to(leftDoor, { xPercent: 0, duration: 0.4, ease: "power2.in" }, "-=0.2")
      .to(rightDoor, { xPercent: 0, duration: 0.4, ease: "power2.in" }, "<")
      .call(() => setState("moving"))

      // Phase 2: Show interior + counter (500ms)
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
      {/* ── Injected keyframe styles ── */}
      <style>{ELEVATOR_STYLES}</style>

      {/* ══════════════════════════════════════════════════════
          DESKTOP PANEL (md and above, left side)
         ══════════════════════════════════════════════════════ */}
      <div
        className="fixed left-0 top-0 bottom-0 z-[30] hidden md:flex flex-col items-center w-16"
        aria-hidden="false"
      >
        {/* ── Elevator Cable: extends from panel top to viewport top ── */}
        <div
          className="flex-1 flex flex-col items-center pt-0"
          aria-hidden="true"
          style={{ minHeight: 0 }}
        >
          <div
            className="elevator-cable"
            style={{
              width: "1px",
              height: "100%",
              minHeight: "8px",
            }}
          />
        </div>

        {/* ── Nav Panel ── */}
        <nav
          className="flex flex-col items-center"
          aria-label="Floor navigation"
          style={{ flexShrink: 0 }}
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
              borderLeft: "3px solid rgba(201, 168, 76, 0.35)",
              boxShadow:
                "0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* ── Panel Header: THE TOWER ── */}
            <div
              className="flex flex-col items-center gap-1 pb-2 mb-0.5"
              style={{
                borderBottom: "1px solid rgba(201, 168, 76, 0.12)",
              }}
              aria-hidden="true"
            >
              {/* Tiny tower icon SVG */}
              <svg
                width="16"
                height="20"
                viewBox="0 0 16 20"
                fill="none"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                {/* Tower silhouette */}
                <rect
                  x="6.5"
                  y="0"
                  width="3"
                  height="3"
                  fill="rgba(201,168,76,0.9)"
                />
                <rect
                  x="5"
                  y="3"
                  width="6"
                  height="2"
                  fill="rgba(201,168,76,0.85)"
                />
                <rect
                  x="3.5"
                  y="5"
                  width="9"
                  height="10"
                  fill="rgba(201,168,76,0.25)"
                  stroke="rgba(201,168,76,0.6)"
                  strokeWidth="0.75"
                />
                {/* Windows */}
                <rect x="5.5" y="7" width="2" height="2" fill="rgba(201,168,76,0.5)" />
                <rect x="8.5" y="7" width="2" height="2" fill="rgba(201,168,76,0.5)" />
                <rect x="5.5" y="10.5" width="2" height="2" fill="rgba(201,168,76,0.5)" />
                <rect x="8.5" y="10.5" width="2" height="2" fill="rgba(201,168,76,0.5)" />
                {/* Base */}
                <rect x="2" y="15" width="12" height="2" fill="rgba(201,168,76,0.5)" />
                <rect x="0" y="17" width="16" height="2" fill="rgba(201,168,76,0.4)" />
              </svg>
              {/* THE TOWER label */}
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "7px",
                  color: "rgba(201, 168, 76, 0.85)",
                  letterSpacing: "0.3em",
                  lineHeight: 1,
                  textTransform: "uppercase",
                  display: "block",
                }}
              >
                TOWER
              </span>
            </div>

            {/* ── Floor Buttons ── */}
            {FLOOR_ORDER.map((floorId) => {
              const floor = FLOORS.find((f) => f.id === floorId);
              if (!floor) return null;
              const isActive = floorId === activeFloor;
              const isLobby = floorId === "L";

              return (
                <div key={floorId} className="elevator-btn-wrap">
                  <button
                    onClick={() => navigateToFloor(floorId)}
                    disabled={isTransitioning || isActive}
                    aria-label={`${floor.name} — ${floor.label}`}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "relative w-9 h-9 rounded-full flex items-center justify-center",
                      "text-data text-xs font-medium transition-colors duration-200",
                      "focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-2",
                      isActive ? "elevator-active-btn" : "",
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
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.border = "1px solid rgba(201, 168, 76, 0.3)";
                        el.style.color = "var(--text-primary)";
                        el.style.background = "rgba(201, 168, 76, 0.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && !isTransitioning) {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.border = isLobby
                          ? "1px dashed rgba(201, 168, 76, 0.2)"
                          : "";
                        el.style.color = "var(--text-secondary)";
                        el.style.background = "";
                      }
                    }}
                  >
                    {floorId === "PH" ? (
                      <span className="text-[10px] leading-none">PH</span>
                    ) : (
                      floorId
                    )}
                  </button>

                  {/* Custom CSS tooltip — glass panel to the right */}
                  <div className="elevator-tooltip" role="tooltip" aria-hidden="true">
                    <div
                      style={{
                        background: "rgba(10, 12, 25, 0.92)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        border: "1px solid rgba(201, 168, 76, 0.15)",
                        borderLeft: "2px solid rgba(201, 168, 76, 0.7)",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        boxShadow:
                          "0 4px 16px rgba(0,0,0,0.5), 0 0 8px rgba(201,168,76,0.06)",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "11px",
                          color: "var(--text-primary)",
                          lineHeight: 1.3,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {floor.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "9px",
                          color: "rgba(201, 168, 76, 0.65)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginTop: "1px",
                        }}
                      >
                        {floor.label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── Status Indicator: FLOOR [X] ── */}
            <div
              className="flex flex-col items-center pt-2 mt-0.5"
              style={{
                borderTop: "1px solid rgba(201, 168, 76, 0.12)",
                minWidth: 0,
              }}
              aria-live="polite"
              aria-label={`Current floor: ${activeFloorData?.name ?? activeFloor}`}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "7px",
                  color: "rgba(201, 168, 76, 0.5)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                FLOOR
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "14px",
                  color: "var(--gold)",
                  lineHeight: 1.3,
                  textShadow: "0 0 10px rgba(201,168,76,0.35)",
                  fontWeight: 700,
                }}
              >
                {activeFloor}
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "7px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  lineHeight: 1.2,
                  textAlign: "center",
                  maxWidth: "44px",
                  wordBreak: "break-word",
                  hyphens: "auto",
                }}
              >
                {activeFloorData?.label ?? ""}
              </span>
            </div>
          </div>
        </nav>

        {/* ── Cable below panel (connects to bottom) ── */}
        <div
          className="flex-1 flex flex-col items-center"
          aria-hidden="true"
          style={{ minHeight: 0 }}
        >
          <div
            className="elevator-cable"
            style={{
              width: "1px",
              height: "100%",
              minHeight: "8px",
              opacity: 0.4,
            }}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE BOTTOM BAR (below md breakpoint)
         ══════════════════════════════════════════════════════ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[30] md:hidden"
        role="navigation"
        aria-label="Floor navigation"
      >
        <div
          style={{
            background: "rgba(10, 12, 25, 0.92)",
            backdropFilter: "blur(20px) saturate(1.5)",
            WebkitBackdropFilter: "blur(20px) saturate(1.5)",
            borderTop: "1px solid rgba(201, 168, 76, 0.2)",
            boxShadow:
              "0 -4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,168,76,0.08)",
          }}
        >
          {/* Top gold accent line */}
          <div
            style={{
              height: "2px",
              background:
                "linear-gradient(to right, transparent 0%, rgba(201,168,76,0.6) 20%, rgba(201,168,76,0.9) 50%, rgba(201,168,76,0.6) 80%, transparent 100%)",
            }}
            aria-hidden="true"
          />

          <div className="flex items-center px-3 py-2 gap-1.5">
            {/* Floor counter label on the left */}
            <div
              className="flex flex-col items-center justify-center shrink-0 mr-1"
              aria-live="polite"
              aria-label={`Current floor: ${activeFloorData?.name ?? activeFloor}`}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "7px",
                  color: "rgba(201, 168, 76, 0.5)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                FLR
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "16px",
                  color: "var(--gold)",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  textShadow: "0 0 10px rgba(201,168,76,0.4)",
                }}
              >
                {activeFloor}
              </span>
            </div>

            {/* Vertical divider */}
            <div
              style={{
                width: "1px",
                height: "32px",
                background:
                  "linear-gradient(to bottom, transparent, rgba(201,168,76,0.3), transparent)",
                flexShrink: 0,
                marginRight: "4px",
              }}
              aria-hidden="true"
            />

            {/* Floor buttons in a row */}
            <div className="flex-1 flex items-center justify-around">
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
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      "text-data text-xs font-medium transition-all duration-200",
                      "focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-2",
                      isActive ? "elevator-active-btn" : "",
                      isTransitioning ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      isActive
                        ? {
                            background: "var(--gold)",
                            color: "var(--tower-darkest)",
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
                  >
                    {floorId === "PH" ? (
                      <span className="text-[9px] leading-none">PH</span>
                    ) : (
                      floorId
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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
        {/* Left door — brushed metal gradient with vertical texture + reflection */}
        <div
          ref={leftDoorRef}
          className="absolute top-0 bottom-0 left-0 w-1/2 overflow-hidden"
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
              background: "linear-gradient(to left, rgba(201, 168, 76, 0.06), transparent)",
            }}
            aria-hidden="true"
          />
          {/* Reflection sweep — light gliding across metal surface */}
          <div
            className="door-reflect absolute top-0 bottom-0"
            aria-hidden="true"
            style={{
              left: 0,
              width: "30%",
              background:
                "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 60%, transparent 100%)",
              transform: "translateX(-120%) skewX(-8deg)",
            }}
          />
        </div>

        {/* Right door — brushed metal gradient with vertical texture + reflection */}
        <div
          ref={rightDoorRef}
          className="absolute top-0 bottom-0 right-0 w-1/2 overflow-hidden"
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
          {/* Reflection sweep — mirrored for right door */}
          <div
            className="door-reflect absolute top-0 bottom-0"
            aria-hidden="true"
            style={{
              right: 0,
              left: "auto",
              width: "30%",
              background:
                "linear-gradient(to left, transparent 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 60%, transparent 100%)",
              transform: "translateX(120%) skewX(8deg)",
              animationDirection: "reverse",
            }}
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
            style={{
              borderTop: "2px solid rgba(201,168,76,0.3)",
              borderLeft: "2px solid rgba(201,168,76,0.3)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute top-0 right-0 w-8 h-8"
            style={{
              borderTop: "2px solid rgba(201,168,76,0.3)",
              borderRight: "2px solid rgba(201,168,76,0.3)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 w-8 h-8"
            style={{
              borderBottom: "2px solid rgba(201,168,76,0.3)",
              borderLeft: "2px solid rgba(201,168,76,0.3)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 right-0 w-8 h-8"
            style={{
              borderBottom: "2px solid rgba(201,168,76,0.3)",
              borderRight: "2px solid rgba(201,168,76,0.3)",
            }}
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
