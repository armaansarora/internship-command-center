"use client";

import { type JSX } from "react";
import { FLOORS, FLOOR_ORDER, type FloorId } from "@/lib/constants/floors";

export interface ElevatorDoorsRefs {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  leftDoorRef: React.RefObject<HTMLDivElement | null>;
  rightDoorRef: React.RefObject<HTMLDivElement | null>;
  interiorRef: React.RefObject<HTMLDivElement | null>;
  counterRef: React.RefObject<HTMLSpanElement | null>;
  /**
   * Optional ref to the floor-name caption beneath the counter. Updated in
   * lock-step with `counterRef` so the spoken floor name (e.g. "Penthouse",
   * "The War Room") rides the tick animation alongside the floor id and
   * stays in physical sync with the directional arrow.
   */
  floorNameRef?: React.RefObject<HTMLSpanElement | null>;
  /**
   * Optional ref to the direction arrow (▲ up / ▼ down / · idle). Updated
   * once at transition start so the user sees the physical sense of travel
   * for the entire moving phase.
   */
  directionRef?: React.RefObject<HTMLSpanElement | null>;
  darkWashRef: React.RefObject<HTMLDivElement | null>;
}

interface ElevatorDoorsProps extends ElevatorDoorsRefs {
  activeFloor: string;
}

/** Pure helper — exported so Elevator's `direction = up | down | idle`
 *  arrow is testable without rendering. FLOOR_ORDER goes top → bottom,
 *  so a smaller index means a higher floor (upward travel). */
export function deriveTravelDirection(
  from: FloorId,
  to: FloorId,
): "up" | "down" | "idle" {
  if (from === to) return "idle";
  const fromIdx = FLOOR_ORDER.indexOf(from);
  const toIdx = FLOOR_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return "idle";
  return toIdx < fromIdx ? "up" : "down";
}

/** Resolve a floor id to its display name. PH stays "Penthouse". */
export function floorDisplayName(id: string): string {
  const f = FLOORS.find((x) => x.id === id);
  if (!f) return id;
  return f.name.startsWith("The ") ? f.name.slice(4) : f.name;
}

/** Brushed-metal vertical texture used on both door leaves. */
function MetalTexture(): JSX.Element {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.012) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.008) 3px, transparent 4px)",
        backgroundSize: "4px 100%",
      }}
      aria-hidden="true"
    />
  );
}

/**
 * ElevatorDoors — the full-screen transition overlay composed of:
 * - Dark wash (dim layer that fades in before doors close)
 * - Left door leaf  (slides from off-screen left)
 * - Right door leaf (slides from off-screen right)
 * - Interior panel  (visible while moving; contains floor counter)
 *
 * All refs are forwarded from the parent Elevator so that GSAP can
 * animate each element independently.
 */
export function ElevatorDoors({
  overlayRef,
  leftDoorRef,
  rightDoorRef,
  interiorRef,
  counterRef,
  floorNameRef,
  directionRef,
  darkWashRef,
  activeFloor,
}: ElevatorDoorsProps): JSX.Element {
  return (
    <>
      {/* ── Dark Wash (between-floors effect) ── */}
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
        {/* Left door — brushed metal gradient + reflection */}
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
          <MetalTexture />
          {/* Subtle vertical highlight on inner edge */}
          <div
            className="absolute top-0 bottom-0 right-0 w-4"
            style={{
              background: "linear-gradient(to left, rgba(201, 168, 76, 0.06), transparent)",
            }}
            aria-hidden="true"
          />
          {/* Reflection sweep */}
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

        {/* Right door — mirrored brushed metal gradient + reflection */}
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
          <MetalTexture />
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

          {/* Floor counter — floor id (large) + direction arrow + spoken floor name */}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div
              className="text-data text-xs tracking-[0.3em] uppercase flex items-center gap-2"
              style={{ color: "var(--text-muted)" }}
            >
              <span>Floor</span>
              <span
                ref={directionRef}
                aria-hidden="true"
                data-elevator-direction="idle"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  color: "rgba(201, 168, 76, 0.85)",
                  width: "14px",
                  textAlign: "center",
                  lineHeight: 1,
                }}
              >
                ·
              </span>
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
            <span
              ref={floorNameRef}
              data-elevator-floor-name
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "16px",
                color: "rgba(245, 220, 160, 0.85)",
                letterSpacing: "0.04em",
                marginTop: "-4px",
                opacity: 0.92,
              }}
            >
              {floorDisplayName(activeFloor)}
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
