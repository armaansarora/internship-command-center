"use client";

import { useMemo, type JSX } from "react";
import { FLOORS, FLOOR_ORDER, type FloorId } from "@/lib/constants/floors";
import { ElevatorButton } from "./ElevatorButton";

interface ElevatorPanelProps {
  activeFloor: FloorId;
  isTransitioning: boolean;
  onNavigate: (floorId: FloorId) => void;
}

/** Tower silhouette SVG in the panel header. */
function TowerIcon(): JSX.Element {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="6.5" y="0" width="3" height="3" fill="rgba(201,168,76,0.9)" />
      <rect x="5" y="3" width="6" height="2" fill="rgba(201,168,76,0.85)" />
      <rect
        x="3.5"
        y="5"
        width="9"
        height="10"
        fill="rgba(201,168,76,0.25)"
        stroke="rgba(201,168,76,0.6)"
        strokeWidth="0.75"
      />
      {/* Windows */}
      <rect x="5.5" y="7" width="2" height="2" fill="rgba(201,168,76,0.5)" />
      <rect x="8.5" y="7" width="2" height="2" fill="rgba(201,168,76,0.5)" />
      <rect x="5.5" y="10.5" width="2" height="2" fill="rgba(201,168,76,0.5)" />
      <rect x="8.5" y="10.5" width="2" height="2" fill="rgba(201,168,76,0.5)" />
      {/* Base */}
      <rect x="2" y="15" width="12" height="2" fill="rgba(201,168,76,0.5)" />
      <rect x="0" y="17" width="16" height="2" fill="rgba(201,168,76,0.4)" />
    </svg>
  );
}

const monoStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

/**
 * ElevatorPanel (desktop) — the glass nav panel with floor buttons, tower
 * header, and floor-status indicator.  Mounted inside the fixed left column.
 */
export function ElevatorPanel({
  activeFloor,
  isTransitioning,
  onNavigate,
}: ElevatorPanelProps): JSX.Element {
  const activeFloorData = useMemo(
    () => FLOORS.find((f) => f.id === activeFloor),
    [activeFloor],
  );

  const floorButtons = useMemo(
    () =>
      FLOOR_ORDER.map((floorId) => {
        const floor = FLOORS.find((f) => f.id === floorId);
        if (!floor) return null;
        return (
          <ElevatorButton
            key={floorId}
            floor={floor}
            isActive={floorId === activeFloor}
            isTransitioning={isTransitioning}
            size="md"
            onClick={onNavigate}
          />
        );
      }),
    [activeFloor, isTransitioning, onNavigate],
  );

  return (
    <nav
      className="flex flex-col items-center"
      aria-label="Floor navigation"
      style={{ flexShrink: 0 }}
    >
      <div
        className="rounded-2xl py-3 px-2 flex flex-col items-center gap-1.5"
        style={{
          background: "rgba(10, 12, 25, 0.85)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderTop: "1px solid rgba(201, 168, 76, 0.12)",
          borderRight: "1px solid rgba(201, 168, 76, 0.08)",
          borderBottom: "1px solid rgba(201, 168, 76, 0.08)",
          borderLeft: "3px solid rgba(201, 168, 76, 0.35)",
          boxShadow:
            "0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* ── Panel Header: THE TOWER ── */}
        <div
          className="flex flex-col items-center gap-1 pb-2 mb-0.5"
          style={{ borderBottom: "1px solid rgba(201, 168, 76, 0.12)" }}
          aria-hidden="true"
        >
          <TowerIcon />
          <span
            style={{
              ...monoStyle,
              fontSize: "7px",
              color: "rgba(201, 168, 76, 0.85)",
              letterSpacing: "0.3em",
              lineHeight: 1,
              textTransform: "uppercase",
              display: "block",
            }}
          >
            TOWER
          </span>
        </div>

        {/* ── Floor Buttons ── */}
        {floorButtons}

        {/* ── Status Indicator: FLOOR [X] ── */}
        <div
          className="flex flex-col items-center pt-2 mt-0.5"
          style={{
            borderTop: "1px solid rgba(201, 168, 76, 0.12)",
            minWidth: 0,
          }}
          aria-live="polite"
          aria-label={`Current floor: ${activeFloorData?.name ?? activeFloor}`}
        >
          <span
            style={{
              ...monoStyle,
              fontSize: "7px",
              color: "rgba(201, 168, 76, 0.5)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            FLOOR
          </span>
          <span
            style={{
              ...monoStyle,
              fontSize: "14px",
              color: "var(--gold)",
              lineHeight: 1.3,
              textShadow: "0 0 10px rgba(201,168,76,0.35)",
              fontWeight: 700,
            }}
          >
            {activeFloor}
          </span>
          <span
            style={{
              ...monoStyle,
              fontSize: "7px",
              color: "var(--text-muted)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              lineHeight: 1.2,
              textAlign: "center",
              maxWidth: "44px",
              wordBreak: "break-word",
              hyphens: "auto",
            }}
          >
            {activeFloorData?.label ?? ""}
          </span>
        </div>
      </div>
    </nav>
  );
}

/**
 * ElevatorMobileBar — horizontal floor buttons shown below the md breakpoint.
 */
export function ElevatorMobileBar({
  activeFloor,
  isTransitioning,
  onNavigate,
}: ElevatorPanelProps): JSX.Element {
  const activeFloorData = useMemo(
    () => FLOORS.find((f) => f.id === activeFloor),
    [activeFloor],
  );

  const floorButtons = useMemo(
    () =>
      FLOOR_ORDER.map((floorId) => {
        const floor = FLOORS.find((f) => f.id === floorId);
        if (!floor) return null;
        return (
          <ElevatorButton
            key={floorId}
            floor={floor}
            isActive={floorId === activeFloor}
            isTransitioning={isTransitioning}
            size="sm"
            onClick={onNavigate}
          />
        );
      }),
    [activeFloor, isTransitioning, onNavigate],
  );

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[30] md:hidden"
      role="navigation"
      aria-label="Floor navigation"
    >
      <div
        style={{
          background: "rgba(10, 12, 25, 0.92)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderTop: "1px solid rgba(201, 168, 76, 0.2)",
          boxShadow:
            "0 -4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,168,76,0.08)",
        }}
      >
        {/* Top gold accent line */}
        <div
          style={{
            height: "2px",
            background:
              "linear-gradient(to right, transparent 0%, rgba(201,168,76,0.6) 20%, rgba(201,168,76,0.9) 50%, rgba(201,168,76,0.6) 80%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        <div className="flex items-center px-3 py-2 gap-1.5">
          {/* Floor counter label on the left */}
          <div
            className="flex flex-col items-center justify-center shrink-0 mr-1"
            aria-live="polite"
            aria-label={`Current floor: ${activeFloorData?.name ?? activeFloor}`}
          >
            <span
              style={{
                ...monoStyle,
                fontSize: "7px",
                color: "rgba(201, 168, 76, 0.5)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              FLR
            </span>
            <span
              style={{
                ...monoStyle,
                fontSize: "16px",
                color: "var(--gold)",
                fontWeight: 700,
                lineHeight: 1.1,
                textShadow: "0 0 10px rgba(201,168,76,0.4)",
              }}
            >
              {activeFloor}
            </span>
          </div>

          {/* Vertical divider */}
          <div
            style={{
              width: "1px",
              height: "32px",
              background:
                "linear-gradient(to bottom, transparent, rgba(201,168,76,0.3), transparent)",
              flexShrink: 0,
              marginRight: "4px",
            }}
            aria-hidden="true"
          />

          {/* Floor buttons in a row */}
          <div className="flex-1 flex items-center justify-around">
            {floorButtons}
          </div>
        </div>
      </div>
    </div>
  );
}
