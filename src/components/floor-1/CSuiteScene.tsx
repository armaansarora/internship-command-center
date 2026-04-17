"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import "@/styles/floor-1.css";
import { CSuiteTicker } from "./CSuiteTicker";
import type { CSuiteStats } from "./CSuiteTicker";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type { CSuiteStats };

interface CSuiteSceneProps {
  stats: CSuiteStats;
  /** Main content slot — CEO character + briefing */
  contentSlot?: React.ReactNode;
  /** Right panel slot — Ring the Bell + agent network */
  panelSlot?: React.ReactNode;
}

interface NodeConfig {
  id: number;
  name: string;
  angle: number;
  radius: number;
}

function generateAgentNodes(): NodeConfig[] {
  const agents = ["CRO", "COO", "CNO", "CIO", "CMO", "CPO"];
  return agents.map((name, i) => ({
    id: i,
    name,
    angle: (i / agents.length) * Math.PI * 2 - Math.PI / 2,
    radius: 90,
  }));
}

/**
 * CSuiteScene — Floor 1 C-Suite boardroom environment.
 * Executive gold tones, herringbone floor, panoramic windows, agent network.
 */
export function CSuiteScene({ stats, contentSlot, panelSlot }: CSuiteSceneProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const agentNodes = useMemo(() => generateAgentNodes(), []);

  // SVG agent network dimensions
  const svgW = 220;
  const svgH = 220;
  const cx = svgW / 2;
  const cy = svgH / 2;

  return (
    <div
      data-floor="1"
      className="csuite-bg"
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Atmospheric overlay ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(ellipse 75% 55% at 50% 30%, transparent 35%, rgba(10, 8, 3, 0.55) 100%)",
        }}
      />

      {/* ── Gold top accent line ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background:
            "linear-gradient(to right, transparent, rgba(201, 168, 76, 0.15) 15%, rgba(201, 168, 76, 0.5) 35%, rgba(232, 201, 106, 0.6) 50%, rgba(201, 168, 76, 0.5) 65%, rgba(201, 168, 76, 0.15) 85%, transparent)",
          zIndex: 2,
        }}
      />

      {/* ── Corner accents ── */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
        {[
          { top: "8px",    left: "8px",   borderTop: "1px solid rgba(201, 168, 76, 0.4)", borderLeft: "1px solid rgba(201, 168, 76, 0.4)" },
          { top: "8px",    right: "8px",  borderTop: "1px solid rgba(201, 168, 76, 0.4)", borderRight: "1px solid rgba(201, 168, 76, 0.4)" },
          { bottom: "40px", left: "8px",  borderBottom: "1px solid rgba(201, 168, 76, 0.4)", borderLeft: "1px solid rgba(201, 168, 76, 0.4)" },
          { bottom: "40px", right: "8px", borderBottom: "1px solid rgba(201, 168, 76, 0.4)", borderRight: "1px solid rgba(201, 168, 76, 0.4)" },
        ].map((style, i) => (
          <div key={i} style={{ position: "absolute", width: "20px", height: "20px", ...style }} />
        ))}
      </div>

      {/* ── Main content ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Split layout */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr minmax(280px, 380px)",
            overflow: "hidden",
          }}
        >
          {/* Left — CEO character + briefing */}
          <div
            style={{
              borderRight: "1px solid rgba(201, 168, 76, 0.1)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "24px 20px",
              gap: "16px",
            }}
            aria-label="CEO area"
          >
            {contentSlot}
          </div>

          {/* Right — Agent network + Ring the Bell */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "24px 16px",
              gap: "24px",
              overflowY: "auto",
            }}
            aria-label="Agent network and orchestration"
          >
            {/* Agent network visualization */}
            <div
              role="img"
              aria-label="Agent network diagram showing CEO connected to 6 department heads"
              style={{ flexShrink: 0 }}
            >
              <svg
                width={svgW}
                height={svgH}
                viewBox={`0 0 ${svgW} ${svgH}`}
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Connection lines */}
                {agentNodes.map((node) => {
                  const nx = cx + Math.cos(node.angle) * node.radius;
                  const ny = cy + Math.sin(node.angle) * node.radius;
                  return (
                    <line
                      key={node.id}
                      x1={cx} y1={cy}
                      x2={nx} y2={ny}
                      stroke="rgba(201, 168, 76, 0.2)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Satellite nodes */}
                {agentNodes.map((node) => {
                  const nx = cx + Math.cos(node.angle) * node.radius;
                  const ny = cy + Math.sin(node.angle) * node.radius;
                  return (
                    <g key={node.id}>
                      <circle
                        cx={nx}
                        cy={ny}
                        r="16"
                        fill="rgba(26, 22, 10, 0.9)"
                        stroke="rgba(201, 168, 76, 0.3)"
                        strokeWidth="1"
                        className="agent-node idle"
                      />
                      <text
                        x={nx}
                        y={ny + 4}
                        textAnchor="middle"
                        fill="rgba(201, 168, 76, 0.8)"
                        fontSize="8"
                        fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
                        fontWeight="700"
                        letterSpacing="0.06em"
                      >
                        {node.name}
                      </text>
                    </g>
                  );
                })}

                {/* CEO center node */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="22"
                  fill="rgba(26, 22, 10, 0.95)"
                  stroke="rgba(201, 168, 76, 0.6)"
                  strokeWidth="1.5"
                  className={reducedMotion ? "" : "cs-gold-glow"}
                />
                <text
                  x={cx}
                  y={cy + 4}
                  textAnchor="middle"
                  fill="rgba(201, 168, 76, 0.95)"
                  fontSize="10"
                  fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
                  fontWeight="700"
                  letterSpacing="0.08em"
                >
                  CEO
                </text>
              </svg>
            </div>

            {/* Ring the Bell + agent cards */}
            {panelSlot}
          </div>
        </div>
      </div>

      {/* ── Bottom ticker ── */}
      <div style={{ position: "relative", zIndex: 20, flexShrink: 0 }}>
        <CSuiteTicker stats={stats} />
      </div>
    </div>
  );
}
