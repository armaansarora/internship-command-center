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
 * color. Centralising these keeps the SVG markup declarative.
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
 * Animation technique: SVG + SMIL (`<animateMotion>`) + CSS keyframes. No
 * Canvas, no requestAnimationFrame, no per-frame JS. Streaks travel along
 * pre-computed straight-line paths from the center to each satellite; the
 * browser's native SMIL engine handles all interpolation on the compositor
 * thread. Seven concurrent streaks cost essentially nothing.
 *
 * `prefers-reduced-motion`: SMIL elements are omitted entirely and the CSS
 * pulse keyframe is suppressed via a media query. Nodes still render in the
 * correct state colours so the user sees accurate status — just without
 * motion.
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
      style={{ display: "inline-block", lineHeight: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Edges — dashed gold lines from CEO to each satellite. Rendered
            first so nodes/streaks sit above them. */}
        {nodes.map((node) => (
          <line
            key={`edge-${node.key}`}
            x1={cx}
            y1={cy}
            x2={node.cx}
            y2={node.cy}
            stroke="rgba(201, 168, 76, 0.18)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Satellite nodes + their labels + streaks */}
        {nodes.map((node) => {
          const entry = dispatches[node.key];
          const status: DispatchNodeStatus = entry?.status ?? "idle";
          const tokens = tokensForStatus(status);
          const isRunning = status === "running";
          const isCompleted = status === "completed";
          const motionPath = `M ${cx} ${cy} L ${node.cx} ${node.cy}`;
          const reversePath = `M ${node.cx} ${node.cy} L ${cx} ${cy}`;

          return (
            <g key={`node-${node.key}`} data-agent={node.key} data-state={status}>
              <circle
                cx={node.cx}
                cy={node.cy}
                r={nodeRadius}
                fill={tokens.fill}
                stroke={tokens.stroke}
                strokeWidth={isRunning || isCompleted || status === "failed" ? 1.5 : 1}
                className={isRunning && !reducedMotion ? "dg-node-running" : undefined}
              />
              <text
                x={node.cx}
                y={node.cy + 3}
                textAnchor="middle"
                fontSize="8"
                fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
                fontWeight={700}
                letterSpacing="0.06em"
                fill={tokens.label}
              >
                {node.key.toUpperCase()}
              </text>

              {/* Outbound streak — CEO → node, infinite loop while running.
                  Skipped entirely under prefers-reduced-motion. */}
              {isRunning && !reducedMotion && (
                <circle r={3} fill={tokens.streak}>
                  <animateMotion
                    dur="0.6s"
                    repeatCount="indefinite"
                    path={motionPath}
                  />
                </circle>
              )}

              {/* Return streak — node → CEO, single shot on completion. Uses
                  repeatCount="1" + fill="freeze" so it runs once and stops
                  without needing JS to tear it down. */}
              {isCompleted && showReturnStreak && !reducedMotion && (
                <circle r={3} fill={tokens.streak}>
                  <animateMotion
                    dur="0.6s"
                    repeatCount="1"
                    fill="freeze"
                    path={reversePath}
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* CEO centre node — larger, gold, always glowing (unless reduced
            motion). */}
        <circle
          cx={cx}
          cy={cy}
          r={ceoRadius}
          fill="rgba(26, 22, 10, 0.95)"
          stroke="rgba(201, 168, 76, 0.6)"
          strokeWidth="1.5"
          className={reducedMotion ? undefined : "cs-gold-glow"}
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize="10"
          fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
          fontWeight={700}
          letterSpacing="0.08em"
          fill="rgba(232, 201, 106, 0.95)"
        >
          CEO
        </text>
      </svg>
    </div>
  );
}
