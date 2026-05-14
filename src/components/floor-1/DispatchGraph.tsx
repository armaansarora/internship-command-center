"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Canonical order of the 7 department heads the CEO dispatches to. The radial
 * layout walks this list starting at the top (angle -π/2) and proceeds
 * clockwise. The order is load-bearing: `describeDispatches` enumerates in
 * this order so the aria-label reads deterministically, and the fixed angles
 * make the streak animations pre-computable.
 */
export const DISPATCH_GRAPH_AGENTS = [
  "cro",
  "coo",
  "cno",
  "cio",
  "cmo",
  "cpo",
  "cfo",
] as const;

export type DispatchAgentKey = (typeof DISPATCH_GRAPH_AGENTS)[number];

export type DispatchNodeStatus = "idle" | "running" | "completed" | "failed";

export interface DispatchEntry {
  status: DispatchNodeStatus;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface DispatchGraphProps {
  /**
   * Keyed by lowercase agent key: "cro" | "coo" | "cno" | "cio" | "cmo" |
   * "cpo" | "cfo". Missing keys render as `idle`. Unknown keys (e.g. "ceo",
   * "foo") are ignored — CEO sits at the center and is not a dispatch
   * target.
   */
  dispatches: Record<string, DispatchEntry>;
  /** SVG viewport size in px. Defaults to 260. */
  size?: number;
  /**
   * When a dispatch is `completed`, emit a single return-streak traveling
   * from the department node back to the CEO. Defaults to true.
   */
  showReturnStreak?: boolean;
  className?: string;
}

interface NodeGeometry {
  key: DispatchAgentKey;
  cx: number;
  cy: number;
}

/**
 * Pure helper that composes the aria-label for the graph. Exported for
 * testing and for any caller that needs the same enumeration string outside
 * the component (e.g., server-side announcements).
 *
 * Rules:
 *  - All idle / absent → "Agent network — no departments dispatched".
 *  - Otherwise → "Agent network: X of 7 departments dispatched — CRO running,
 *    COO completed, CFO failed" (only non-idle entries enumerated; canonical
 *    order preserved).
 *  - Unknown keys in `dispatches` are ignored (e.g., "ceo", "foo").
 */
export function describeDispatches(
  dispatches: Record<string, DispatchEntry>,
): string {
  const nonIdle: Array<{ key: DispatchAgentKey; status: DispatchNodeStatus }> = [];
  for (const key of DISPATCH_GRAPH_AGENTS) {
    const entry = dispatches[key];
    if (!entry || entry.status === "idle") continue;
    nonIdle.push({ key, status: entry.status });
  }
  if (nonIdle.length === 0) {
    return "Agent network — no departments dispatched";
  }
  const parts = nonIdle.map(
    ({ key, status }) => `${key.toUpperCase()} ${status}`,
  );
  return `Agent network: ${nonIdle.length} of ${DISPATCH_GRAPH_AGENTS.length} departments dispatched — ${parts.join(", ")}`;
}

/**
 * Returns the per-status visual tokens used for node stroke/fill and label
 * color. Centralising these keeps the HTML/CSS rendering declarative.
 */
function tokensForStatus(status: DispatchNodeStatus): {
  stroke: string;
  fill: string;
  label: string;
  streak: string;
} {
  switch (status) {
    case "running":
      return {
        stroke: "rgba(201, 168, 76, 0.9)",
        fill: "rgba(201, 168, 76, 0.14)",
        label: "rgba(232, 201, 106, 0.95)",
        streak: "rgba(232, 201, 106, 0.95)",
      };
    case "completed":
      return {
        stroke: "rgba(0, 255, 135, 0.7)",
        fill: "rgba(0, 255, 135, 0.08)",
        label: "rgba(0, 255, 135, 0.9)",
        streak: "rgba(0, 255, 135, 0.9)",
      };
    case "failed":
      return {
        stroke: "rgba(255, 80, 80, 0.8)",
        fill: "rgba(255, 60, 60, 0.1)",
        label: "rgba(255, 120, 120, 0.95)",
        streak: "rgba(255, 120, 120, 0.95)",
      };
    case "idle":
    default:
      return {
        stroke: "rgba(201, 168, 76, 0.3)",
        fill: "rgba(26, 22, 10, 0.9)",
        label: "rgba(184, 146, 74, 0.75)",
        streak: "rgba(232, 201, 106, 0.95)",
      };
  }
}

/**
 * DispatchGraph — live radial visualization of CEO → 7 department dispatches.
 *
 * Animation technique: positioned HTML + CSS keyframes. No
 * Canvas, no requestAnimationFrame, no per-frame JS. Streaks travel along
 * pre-computed straight-line paths from the center to each satellite; the
 * browser handles interpolation on the compositor thread. Seven concurrent
 * streaks cost essentially nothing.
 *
 * `prefers-reduced-motion`: streak elements are omitted entirely and the
 * pulse keyframe is suppressed. Nodes still render in the correct state
 * colours so the user sees accurate status, just without motion.
 *
 * Wiring into CSuiteScene happens in R3.7.
 */
export function DispatchGraph({
  dispatches,
  size = 260,
  showReturnStreak = true,
  className,
}: DispatchGraphProps): JSX.Element {
  const reducedMotion = useReducedMotion();

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const ceoRadius = 22;
  const nodeRadius = 14;

  const nodes = useMemo<NodeGeometry[]>(() => {
    return DISPATCH_GRAPH_AGENTS.map((key, i) => {
      const angle = (i / DISPATCH_GRAPH_AGENTS.length) * Math.PI * 2 - Math.PI / 2;
      return {
        key,
        cx: cx + Math.cos(angle) * radius,
        cy: cy + Math.sin(angle) * radius,
      };
    });
  }, [cx, cy, radius]);

  const ariaLabel = useMemo(() => describeDispatches(dispatches), [dispatches]);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ position: "relative", display: "inline-block", width: size, height: size }}
    >
      {nodes.map((node) => {
        const dx = node.cx - cx;
        const dy = node.cy - cy;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <span
            key={`edge-${node.key}`}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              width: length,
              height: 1,
              transform: `rotate(${angle}deg)`,
              transformOrigin: "0 0",
              background: "repeating-linear-gradient(90deg, rgba(201,168,76,0.18) 0 4px, transparent 4px 8px)",
            }}
          />
        );
      })}

      {nodes.map((node) => {
        const entry = dispatches[node.key];
        const status: DispatchNodeStatus = entry?.status ?? "idle";
        const isRunning = status === "running";
        const isReturning = status === "completed" && showReturnStreak;
        if (reducedMotion || (!isRunning && !isReturning)) return null;

        const dx = node.cx - cx;
        const dy = node.cy - cy;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const tokens = tokensForStatus(status);
        const streakKind = isRunning ? "outbound" : "return";

        return (
          <span
            key={`streak-${node.key}-${streakKind}`}
            data-dispatch-streak={streakKind}
            data-dispatch-agent={node.key}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              width: length,
              height: 8,
              transform: `rotate(${angle}deg) translateY(-4px)`,
              transformOrigin: "0 50%",
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 2,
                width: 10,
                height: 4,
                borderRadius: 999,
                background: tokens.streak,
                boxShadow: `0 0 12px ${tokens.streak}`,
                animation:
                  streakKind === "outbound"
                    ? "dg-css-streak 1.4s linear infinite"
                    : "dg-css-streak 900ms ease-out 1 reverse forwards",
              }}
            />
          </span>
        );
      })}

      {nodes.map((node) => {
        const entry = dispatches[node.key];
        const status: DispatchNodeStatus = entry?.status ?? "idle";
        const tokens = tokensForStatus(status);
        const isRunning = status === "running";
        const isCompleted = status === "completed";

        return (
          <span
            key={`node-${node.key}`}
            data-agent={node.key}
            data-state={status}
            style={{
              position: "absolute",
              left: node.cx - nodeRadius,
              top: node.cy - nodeRadius,
              width: nodeRadius * 2,
              height: nodeRadius * 2,
              borderRadius: "50%",
              border: `${isRunning || isCompleted || status === "failed" ? 1.5 : 1}px solid ${tokens.stroke}`,
              background: tokens.fill,
              display: "grid",
              placeItems: "center",
              color: tokens.label,
              fontSize: 8,
              fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
              fontWeight: 700,
              letterSpacing: "0.06em",
              boxShadow: isRunning && !reducedMotion ? `0 0 18px ${tokens.streak}` : undefined,
              animation: isRunning && !reducedMotion ? "dg-node-pulse 1.2s ease-in-out infinite" : undefined,
            }}
          >
            {node.key.toUpperCase()}
            {isCompleted && showReturnStreak && !reducedMotion && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: tokens.streak,
                  boxShadow: `0 0 10px ${tokens.streak}`,
                }}
              />
            )}
          </span>
        );
      })}

      <span
        aria-hidden="true"
        className={reducedMotion ? undefined : "cs-gold-glow"}
        style={{
          position: "absolute",
          left: cx - ceoRadius,
          top: cy - ceoRadius,
          width: ceoRadius * 2,
          height: ceoRadius * 2,
          borderRadius: "50%",
          border: "1.5px solid rgba(201, 168, 76, 0.6)",
          background: "rgba(26, 22, 10, 0.95)",
          color: "rgba(232, 201, 106, 0.95)",
          display: "grid",
          placeItems: "center",
          fontSize: 10,
          fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}
      >
        CEO
      </span>
      <style>{`
        @keyframes dg-css-streak {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateX(calc(100% - 10px)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
