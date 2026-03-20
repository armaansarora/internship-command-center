"use client";

import type { JSX, ReactNode } from "react";
import { FloorShell } from "./FloorShell";
import type { FloorId } from "@/types/ui";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface FloorStubProps {
  /** Floor id — passed directly to FloorShell */
  floorId: FloorId;
  /** Display label shown in the monospace badge above the title, e.g. "Floor 7" */
  floorLabel: string;
  /** Floor name heading, e.g. "The War Room" */
  floorName: string;
  /** Short description paragraph */
  description: ReactNode;
  /** Phase indicator string, e.g. "Phase 1 — Development Queued" */
  phase: string;
  /**
   * Full CSS color used for:
   *   - pulse dot center background
   *   - COMING SOON text color
   * e.g. "rgba(220, 60, 60, 0.9)" or "var(--gold)"
   */
  accentColor: string;
  /**
   * RGB triple for the pulse dot ping ring, e.g. "220, 60, 60".
   * Used as rgba(R, G, B, 0.6) for the ping animation.
   */
  accentRgb: string;
  /**
   * Full CSS color string for the card border, e.g. "rgba(220, 60, 60, 0.15)".
   */
  cardBorderColor: string;
  /**
   * Optional animation delay for the ping ring, e.g. "0.3s". Defaults to "0s".
   */
  pingDelay?: string;
  /**
   * Optional animation duration override for the ping ring, e.g. "0.9s".
   */
  pingDuration?: string;
  /**
   * The unique background atmosphere for this floor.
   * Rendered as absolute overlays behind the card (pointer-events-none).
   */
  atmosphereRenderer: ReactNode;
  /**
   * Optional unique preview widget rendered inside the card (above phase indicator).
   */
  previewSlot?: ReactNode;
  /**
   * Optional extra inline content appended to the description.
   * Used by Writing Room for its blinking cursor.
   */
  descriptionSuffix?: ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FloorStub — shared layout for all floor stub (coming-soon) pages.
 *
 * Keeps: floor card, pulse dot, floor label, h1, description, COMING SOON badge,
 *        preview slot, phase indicator.
 *
 * Each page supplies:
 *   - atmosphereRenderer — unique CSS background/animation overlays
 *   - previewSlot        — floor-specific widget (stat boxes, chart bars, etc.)
 *   - accentColor / accentRgb / cardBorderColor
 */
export function FloorStub({
  floorId,
  floorLabel,
  floorName,
  description,
  phase,
  accentColor,
  accentRgb,
  cardBorderColor,
  pingDelay = "0s",
  pingDuration,
  atmosphereRenderer,
  previewSlot,
  descriptionSuffix,
}: FloorStubProps): JSX.Element {
  return (
    <FloorShell floorId={floorId}>
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 p-8">

        {/* Unique atmosphere overlay — full coverage, pointer-events-none */}
        {atmosphereRenderer}

        {/* Main card — fades up on mount */}
        <div
          className="floor-card-enter relative z-10 max-w-lg w-full rounded-xl p-8"
          style={{
            background: "rgba(10, 12, 25, 0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: `1px solid ${cardBorderColor}`,
            boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Floor label row */}
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{
                  background: `rgba(${accentRgb}, 0.6)`,
                  animationDelay: pingDelay,
                  ...(pingDuration ? { animationDuration: pingDuration } : {}),
                }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: accentColor }}
              />
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "var(--gold)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              {floorLabel}
            </span>
          </div>

          {/* Floor name */}
          <h1
            className="mb-3"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.4rem, 3vw, 1.875rem)",
              color: "var(--text-primary)",
              lineHeight: 1.2,
            }}
          >
            {floorName}
          </h1>

          {/* Description */}
          <p
            className="mb-6"
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            {description}
            {descriptionSuffix}
          </p>

          {/* COMING SOON badge */}
          <div className="mb-8">
            <span
              className="coming-soon-glow"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: accentColor,
              }}
            >
              ▍ COMING SOON
            </span>
          </div>

          {/* Floor-specific preview widget */}
          {previewSlot}

          {/* Phase indicator */}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {phase}
            </span>
          </div>
        </div>
      </div>
    </FloorShell>
  );
}
