"use client";

import { useEffect, useState, type JSX } from "react";
import type { UndoBarController } from "./useUndoBarController";

interface UndoBarProps {
  controller: UndoBarController;
  /** Total undo window in seconds — the radial countdown drains over this duration. */
  windowSeconds?: number;
}

/**
 * In-world undo bar.
 *
 * Zero toast, zero alert. The phase string on the controller drives every
 * visible byte of UI — idle renders nothing, in_flight renders countdown +
 * Cancel, cancelled shows "Caught it", too_late shows "Already left the
 * building".
 *
 * Lives at the bottom-center of the viewport. Slides up on enter, fades on
 * exit. Respects prefers-reduced-motion.
 */
export function UndoBar({ controller, windowSeconds = 30 }: UndoBarProps): JSX.Element | null {
  const { state, cancel } = controller;
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Update visible countdown every 250ms while in_flight.
  useEffect(() => {
    if (state.phase !== "in_flight") return;
    const t = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [state.phase]);

  if (state.phase === "idle") return null;

  const remainingMs =
    state.sendAfterMs !== null ? Math.max(0, state.sendAfterMs - nowMs) : 0;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress =
    state.sendAfterMs !== null && windowSeconds > 0
      ? Math.max(0, Math.min(1, remainingMs / (windowSeconds * 1000)))
      : 0;

  const copy = computeCopy(state.phase, state.recipient);
  const accent = phaseAccent(state.phase);

  // Countdown ring math — a single SVG circle whose stroke-dashoffset drains.
  const RADIUS = 16;
  const CIRC = 2 * Math.PI * RADIUS;

  return (
    <div
      role={state.phase === "too_late" ? "alert" : "status"}
      aria-label={copy}
      data-undo-phase={state.phase}
      style={{
        position: "fixed",
        left: "50%",
        bottom: 72,
        transform: "translateX(-50%)",
        zIndex: 55,
        minWidth: 360,
        maxWidth: 520,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "rgba(14, 16, 32, 0.96)",
        border: `1px solid ${accent}`,
        borderTop: `2px solid ${accent}`,
        borderRadius: 4,
        boxShadow: `0 18px 48px rgba(0,0,0,0.5), 0 0 0 1px ${accent}20`,
        fontFamily: "'Playfair Display', Georgia, serif",
        color: "#FDF3E8",
        animation: "undo-bar-slide-in 240ms ease-out forwards",
      }}
    >
      <p
        style={{
          flex: 1,
          margin: 0,
          fontSize: 15,
          lineHeight: 1.45,
          color: "#FDF3E8",
        }}
      >
        {copy}
      </p>

      {/* Countdown ring — only rendered during in_flight */}
      {state.phase === "in_flight" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg
            width={40}
            height={40}
            viewBox="0 0 40 40"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <circle
              cx="20"
              cy="20"
              r={RADIUS}
              fill="none"
              stroke="rgba(220, 124, 40, 0.18)"
              strokeWidth="2"
            />
            <circle
              cx="20"
              cy="20"
              r={RADIUS}
              fill="none"
              stroke={accent}
              strokeWidth="2"
              strokeLinecap="round"
              transform="rotate(-90 20 20)"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - progress)}
              style={{ transition: "stroke-dashoffset 240ms linear" }}
            />
            <text
              x="20"
              y="24"
              textAnchor="middle"
              fontSize="11"
              fontFamily="'JetBrains Mono', monospace"
              fill={accent}
            >
              {remainingSec}
            </text>
          </svg>
          <button
            type="button"
            onClick={() => {
              void cancel();
            }}
            style={{
              padding: "6px 14px",
              background: "transparent",
              color: accent,
              border: `1px solid ${accent}`,
              borderRadius: 3,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Spinner during cancelling */}
      {state.phase === "cancelling" && (
        <span
          aria-hidden="true"
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: `2px solid ${accent}40`,
            borderTopColor: accent,
            animation: "undo-bar-spin 800ms linear infinite",
            flexShrink: 0,
          }}
        />
      )}

      <style>{`
        @keyframes undo-bar-slide-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes undo-bar-spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes undo-bar-slide-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}

function computeCopy(
  phase: UndoBarProps["controller"]["state"]["phase"],
  recipient: string | null,
): string {
  const to = recipient ?? "recipient";
  switch (phase) {
    case "in_flight":
      return `Outreach dispatched to ${to}.`;
    case "cancelling":
      return `Catching the tube…`;
    case "cancelled":
      return `Caught it. Still pending approval.`;
    case "too_late":
      return `Already left the building.`;
    default:
      return "";
  }
}

function phaseAccent(phase: UndoBarProps["controller"]["state"]["phase"]): string {
  switch (phase) {
    case "too_late":
      return "#E84040";
    case "cancelled":
      return "#6FB26F";
    default:
      return "#DC7C28";
  }
}
