"use client";

import type { JSX } from "react";
import "@/styles/floor-1.css";
import { CSuiteTicker } from "./CSuiteTicker";
import type { CSuiteStats } from "./CSuiteTicker";

export type { CSuiteStats };

interface CSuiteSceneProps {
  stats: CSuiteStats;
  /** Main content slot — CEO character + briefing */
  contentSlot?: React.ReactNode;
  /**
   * Graph slot — the live `DispatchGraph` sits here, above the panel slot.
   * Optional for typing reasons; `CSuiteClient` always provides one. When
   * absent we render nothing (no static placeholder).
   */
  graphSlot?: React.ReactNode;
  /** Right panel slot — Ring the Bell + agent network */
  panelSlot?: React.ReactNode;
  /**
   * R3.10 — current bell phase, forwarded by CSuiteClient from RingTheBell.
   * Surfaces on the root div as `data-bell-phase` so floor-1.css can key the
   * camera-pullback (scale 0.97 + -8px translate) and the atmospheric
   * brightness dim off this attribute + the sibling `--building-dim` var.
   */
  bellPhase?: "idle" | "ringing" | "orchestrating" | "complete";
  /**
   * R10.5 — The Negotiation Parlor door. MUST be undefined when the user
   * has zero offers — the door must be ABSENT from the DOM entirely, not
   * hidden via CSS. The invariant is locked in
   * `src/app/__tests__/r10-parlor-door-absence.proof.test.tsx`.
   */
  doorSlot?: React.ReactNode;
}

/**
 * CSuiteScene — Floor 1 C-Suite boardroom environment.
 * Executive gold tones, herringbone floor, panoramic windows, agent network.
 *
 * As of R3.7 the radial agent network is no longer a static SVG baked into
 * this scene — it's a live `DispatchGraph` passed in via `graphSlot`, driven
 * by a merge of the CEO dialogue's tool-call stream and polled
 * `agent_dispatches` rows. This file only composes the layout; the graph
 * itself lives in `DispatchGraph.tsx`.
 */
export function CSuiteScene({
  stats,
  contentSlot,
  graphSlot,
  panelSlot,
  bellPhase,
  doorSlot,
}: CSuiteSceneProps): JSX.Element {
  return (
    <div
      data-floor="1"
      data-bell-phase={bellPhase ?? "idle"}
      className="csuite-bg"
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Atmospheric overlay ──
          R3.10 — brightness() multiplies against the --building-dim CSS var
          that RingTheBell sets on <html>. During the `ringing` phase the var
          is 0.4 so the whole overlay darkens; it eases back to 1.0 once we
          hit `orchestrating`. Reduced-motion users never see the var set at
          all, so brightness() resolves to 1 (the fallback) and the scene
          stays static. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(ellipse 75% 55% at 50% 30%, transparent 35%, rgba(10, 8, 3, 0.55) 100%)",
          filter: "brightness(var(--building-dim, 1))",
          transition: "filter 0.6s ease",
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
              position: "relative",
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
            {/* R10.5 — The Parlor door. ABSENT from the DOM when the user has
                zero offers — see r10-parlor-door-absence.proof.test.tsx. The
                slot itself is the gating mechanism; do NOT always-render and
                then hide via CSS. */}
            {doorSlot && <div data-testid="csuite-door-slot">{doorSlot}</div>}
          </div>

          {/* Right — live DispatchGraph + Ring the Bell */}
          <div
            data-testid="csuite-right-column"
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
            {/* Graph slot — live DispatchGraph goes here (R3.7). Sits where
                the static SVG used to sit, directly above the Ring the Bell
                panel. Nothing is rendered when the slot is absent. */}
            {graphSlot && (
              <div data-testid="csuite-graph-slot" style={{ flexShrink: 0 }}>
                {graphSlot}
              </div>
            )}

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
