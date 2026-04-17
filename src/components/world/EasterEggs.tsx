"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  startTransition,
  type JSX,
} from "react";
import {
  shouldShowMidnightFireworks,
  markMidnightFireworksShown,
  CHARACTER_BACKSTORIES,
  ElevatorClickTracker,
} from "@/lib/easter-eggs";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ─── Types ─────────────────────────────────────────────────────────────────

interface FireworkParticle {
  id: number;
  /** CSS custom props for position offsets */
  dx: number;
  dy: number;
  /** Origin within viewport as % */
  originX: number;
  originY: number;
  color: string;
  size: number;
  delay: number;
}

// ─── Midnight Fireworks ─────────────────────────────────────────────────────

function generateBurst(
  burstIndex: number,
  idOffset: number,
): FireworkParticle[] {
  const origins = [
    { x: 25, y: 35 },
    { x: 50, y: 25 },
    { x: 75, y: 35 },
  ];
  const { x: originX, y: originY } = origins[burstIndex % origins.length];
  const colors = ["#C9A84C", "#E8C45A", "#FFFFFF", "#F0EDE6", "#8B7634"];
  const count = 20;

  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI;
    const radius = 60 + Math.random() * 40;
    return {
      id: idOffset + i,
      dx: Math.round(Math.cos(angle) * radius),
      dy: Math.round(Math.sin(angle) * radius),
      originX,
      originY,
      color: colors[i % colors.length],
      size: 2 + (i % 3),
      delay: burstIndex * 0.4 + i * 0.02,
    };
  });
}

function MidnightFireworks(): JSX.Element {
  const particles: FireworkParticle[] = [
    ...generateBurst(0, 0),
    ...generateBurst(1, 20),
    ...generateBurst(2, 40),
  ];

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9990,
        overflow: "hidden",
      }}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.originX}%`,
            top: `${p.originY}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: "50%",
            background: p.color,
            boxShadow: `0 0 4px ${p.color}`,
            animationName: "firework-burst",
            animationDuration: "1.2s",
            animationTimingFunction: "cubic-bezier(0.2, 0.8, 0.4, 1)",
            animationDelay: `${p.delay}s`,
            animationFillMode: "both",
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── 100-App Confetti ──────────────────────────────────────────────────────

interface ConfettiDrop {
  id: number;
  left: number;
  color: string;
  size: number;
  spin: number;
  delay: number;
  duration: number;
}

function HundredAppConfetti({
  onDone,
}: {
  onDone: () => void;
}): JSX.Element {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const drops: ConfettiDrop[] = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: 1 + (i * 2) % 98,
    color:
      i % 4 === 0
        ? "#C9A84C"
        : i % 4 === 1
          ? "#E8C45A"
          : i % 4 === 2
            ? "#FFFFFF"
            : "#F0EDE6",
    size: 4 + (i % 5),
    spin: 360 + (i % 3) * 360,
    delay: (i % 10) * 0.06,
    duration: 2.5 + (i % 5) * 0.2,
  }));

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9995,
        overflow: "hidden",
      }}
    >
      {drops.map((d) => (
        <span
          key={d.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${d.left}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            background: d.color,
            borderRadius: d.id % 3 === 0 ? "50%" : "1px",
            animationName: "confetti-cascade",
            animationDuration: `${d.duration}s`,
            animationTimingFunction: "linear",
            animationDelay: `${d.delay}s`,
            animationFillMode: "both",
            "--spin": `${d.spin}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── Character Nameplate ────────────────────────────────────────────────────

interface CharacterNameplateProps {
  role: keyof typeof CHARACTER_BACKSTORIES;
}

/**
 * Shown below an idle character.
 * On hover (or long-press on touch), reveals a 1-line backstory tooltip.
 */
export function CharacterNameplate({
  role,
}: CharacterNameplateProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backstory = CHARACTER_BACKSTORIES[role] ?? "";

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowTooltip(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setTimeout(() => setShowTooltip(false), 2000);
  }, []);

  return (
    <div
      style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Nameplate */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          borderRadius: "999px",
          background: "rgba(10, 10, 20, 0.7)",
          border: "1px solid rgba(201, 168, 76, 0.2)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            background: "#C9A84C",
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.08em",
            color: "#C9A84C",
          }}
        >
          {role}
        </span>
      </div>

      {/* Backstory tooltip */}
      {showTooltip && backstory && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            background: "rgba(10, 10, 20, 0.95)",
            border: "1px solid rgba(201, 168, 76, 0.25)",
            borderRadius: "8px",
            padding: "6px 10px",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 100,
            pointerEvents: "none",
          }}
        >
          <p
            style={{
              fontFamily: "Satoshi, sans-serif",
              fontSize: "11px",
              color: "rgba(240,237,230,0.85)",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {backstory}
          </p>
          {/* Arrow */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              border: "5px solid transparent",
              borderTopColor: "rgba(201, 168, 76, 0.25)",
              display: "block",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Elevator Overheat Message ──────────────────────────────────────────────

interface ElevatorOverheatProps {
  onDismiss: () => void;
}

export function ElevatorOverheatMessage({
  onDismiss,
}: ElevatorOverheatProps): JSX.Element {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: "6px",
        background: "rgba(201, 168, 76, 0.12)",
        border: "1px solid rgba(201, 168, 76, 0.3)",
        animation: "milestone-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      <span
        style={{
          fontFamily: "Satoshi, sans-serif",
          fontSize: "11px",
          color: "#C9A84C",
        }}
      >
        Easy there! The elevator&apos;s going as fast as it can.
      </span>
    </div>
  );
}

// ─── Main EasterEggs orchestrator ───────────────────────────────────────────

interface EasterEggsProps {
  /** Pass true when the `hundred_apps` milestone is freshly unlocked */
  showHundredAppConfetti?: boolean;
  onHundredAppConfettiDone?: () => void;
}

/**
 * EasterEggs — top-level component that orchestrates all easter egg effects.
 * Drop this once into the authenticated layout (or world-shell).
 * Renders nothing visible when no eggs are active.
 */
export function EasterEggs({
  showHundredAppConfetti = false,
  onHundredAppConfettiDone,
}: EasterEggsProps): JSX.Element {
  const [showFireworks, setShowFireworks] = useState(false);
  const reduced = useReducedMotion();

  // Midnight fireworks — check on mount
  useEffect(() => {
    if (reduced) return;
    if (shouldShowMidnightFireworks()) {
      startTransition(() => setShowFireworks(true));
      markMidnightFireworksShown();
      const t = setTimeout(() => {
        startTransition(() => setShowFireworks(false));
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [reduced]);

  return (
    <>
      {showFireworks && !reduced && <MidnightFireworks />}
      {showHundredAppConfetti && !reduced && (
        <HundredAppConfetti
          onDone={onHundredAppConfettiDone ?? (() => undefined)}
        />
      )}
    </>
  );
}

// ─── Hook: Elevator click tracking ─────────────────────────────────────────

/**
 * useElevatorClickTracker — attach this to elevator button clicks.
 * Returns { recordClick, showOverheat, clearOverheat }.
 */
export function useElevatorClickTracker(): {
  recordClick: () => void;
  showOverheat: boolean;
  clearOverheat: () => void;
} {
  const tracker = useRef(new ElevatorClickTracker());
  const [showOverheat, setShowOverheat] = useState(false);

  const recordClick = useCallback(() => {
    const triggered = tracker.current.record();
    if (triggered && !showOverheat) {
      setShowOverheat(true);
      tracker.current.reset();
    }
  }, [showOverheat]);

  const clearOverheat = useCallback(() => {
    setShowOverheat(false);
  }, []);

  return { recordClick, showOverheat, clearOverheat };
}
