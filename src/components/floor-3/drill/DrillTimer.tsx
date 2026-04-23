"use client";

import type { JSX } from "react";

/**
 * R6.6 — DrillTimer.
 *
 * Small, visible clock. Cool blue under pressure; amber past 90 seconds;
 * red past 120 seconds. The color band matches `interrupt-rules.ts`:
 * "wrapping_up" triggers at 90s, "over_time" at 120s, so the candidate
 * sees the color change before (or as) CPO starts interrupting.
 *
 * The component is pure — timing is driven entirely by the parent
 * (`elapsedMs` flows in, color + label flow out). This keeps the timer
 * a dumb display widget and lets DrillStage own the interval logic.
 */

export function formatTimerLabel(elapsedMs: number): string {
  const safeMs = Math.max(0, elapsedMs);
  const total = Math.floor(safeMs / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(1, "0")}:${s.toString().padStart(2, "0")}`;
}

export function timerColor(elapsedMs: number): string {
  if (elapsedMs > 120_000) return "#DC3C3C";
  if (elapsedMs > 90_000) return "#F59E0B";
  return "#4A9EDB";
}

interface Props {
  elapsedMs: number;
  targetSeconds: number;
}

export function DrillTimer({ elapsedMs, targetSeconds }: Props): JSX.Element {
  const color = timerColor(elapsedMs);
  const label = formatTimerLabel(elapsedMs);
  return (
    <div
      role="timer"
      aria-label={`Drill timer ${label}, target ${targetSeconds} seconds`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        border: `1px solid ${color}`,
        borderRadius: 2,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        color,
        letterSpacing: "0.04em",
        background: `${color}14`,
        transition: "color 0.3s ease-out, border-color 0.3s ease-out, background 0.3s ease-out",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 4px ${color}`,
        }}
      />
      <span>{label}</span>
    </div>
  );
}
