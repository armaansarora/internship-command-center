"use client";

import { type JSX } from "react";

export interface ElevatorDoorsRefs {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  leftDoorRef: React.RefObject<HTMLDivElement | null>;
  rightDoorRef: React.RefObject<HTMLDivElement | null>;
  interiorRef: React.RefObject<HTMLDivElement | null>;
  counterRef: React.RefObject<HTMLSpanElement | null>;
  darkWashRef: React.RefObject<HTMLDivElement | null>;
}

interface ElevatorDoorsProps extends ElevatorDoorsRefs {
  activeFloor: string;
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
