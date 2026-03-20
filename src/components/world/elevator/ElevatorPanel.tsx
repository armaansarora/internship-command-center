"use client";

import { useMemo, useState, useRef, useCallback, useEffect, type JSX } from "react";
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
 * Uses glass-liquid-gold class for liquid glass polish.
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
        className="glass-liquid-gold rounded-2xl py-3 px-2 flex flex-col items-center gap-1.5"
        style={{
          borderLeft: "3px solid rgba(201, 168, 76, 0.35)",
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

// ── Swipe-to-dismiss hook ──────────────────────────────────────────────────
/**
 * Detects a downward swipe gesture on a given element and calls onDismiss.
 * Threshold: 60px vertical drag downward.
 */
function useSwipeToDismiss(
  ref: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startY = 0;

    function onTouchStart(e: TouchEvent): void {
      startY = e.touches[0]?.clientY ?? 0;
    }

    function onTouchEnd(e: TouchEvent): void {
      const endY = e.changedTouches[0]?.clientY ?? 0;
      if (endY - startY > 60) {
        onDismiss();
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [ref, onDismiss]);
}

/**
 * ElevatorMobileBar — bottom navigation bar shown below the md breakpoint.
 *
 * Collapsed: shows current floor indicator + "expand" chevron.
 * Expanded:  slides up a bottom sheet with all floor buttons and their names.
 * Swipe down to dismiss the expanded sheet.
 */
export function ElevatorMobileBar({
  activeFloor,
  isTransitioning,
  onNavigate,
}: ElevatorPanelProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const activeFloorData = useMemo(
    () => FLOORS.find((f) => f.id === activeFloor),
    [activeFloor],
  );

  const dismiss = useCallback(() => setExpanded(false), []);
  useSwipeToDismiss(sheetRef, dismiss);

  // Close sheet on navigation
  const handleNavigate = useCallback(
    (floorId: FloorId) => {
      setExpanded(false);
      onNavigate(floorId);
    },
    [onNavigate],
  );

  // All floor buttons for the sheet (with names visible)
  const sheetFloorItems = useMemo(
    () =>
      FLOOR_ORDER.map((floorId) => {
        const floor = FLOORS.find((f) => f.id === floorId);
        if (!floor) return null;
        const isActive = floorId === activeFloor;
        return (
          <button
            key={floorId}
            onClick={() => handleNavigate(floorId)}
            disabled={isTransitioning || isActive}
            aria-current={isActive ? "page" : undefined}
            aria-label={`${floor.name} — ${floor.label}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "10px 16px",
              background: isActive
                ? "rgba(201, 168, 76, 0.12)"
                : "transparent",
              border: "none",
              borderRadius: "8px",
              cursor: isActive || isTransitioning ? "default" : "pointer",
              opacity: isTransitioning && !isActive ? 0.5 : 1,
              minHeight: "44px",
            }}
          >
            {/* Floor number badge */}
            <span
              style={{
                ...monoStyle,
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 700,
                background: isActive ? "var(--gold)" : "rgba(255,255,255,0.06)",
                color: isActive ? "var(--tower-darkest)" : "var(--text-secondary)",
                flexShrink: 0,
                border: isActive
                  ? "none"
                  : "1px solid rgba(201, 168, 76, 0.2)",
              }}
            >
              {floorId === "PH" ? "PH" : floorId}
            </span>

            {/* Floor name and label */}
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
              <span
                style={{
                  fontFamily: "'Satoshi', system-ui, sans-serif",
                  fontSize: "14px",
                  color: isActive ? "var(--gold)" : "var(--text-primary)",
                  fontWeight: isActive ? 600 : 400,
                  lineHeight: 1.2,
                }}
              >
                {floor.name}
              </span>
              <span
                style={{
                  ...monoStyle,
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                {floor.label}
              </span>
            </span>

            {/* Active indicator */}
            {isActive && (
              <span
                style={{
                  marginLeft: "auto",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--gold)",
                  boxShadow: "0 0 8px rgba(201,168,76,0.7)",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              />
            )}
          </button>
        );
      }),
    [activeFloor, isTransitioning, handleNavigate],
  );

  return (
    <>
      {/* ── Backdrop (when expanded) ── */}
      {expanded && (
        <div
          className="fixed inset-0 z-[28] md:hidden"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
          onClick={dismiss}
          aria-hidden="true"
        />
      )}

      {/* ── Bottom Sheet (expanded floor list) ── */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[29] md:hidden"
        role="dialog"
        aria-label="Floor navigation"
        aria-modal="true"
        aria-hidden={!expanded}
        style={{
          transform: expanded ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
          background: "rgba(10, 12, 25, 0.97)",
          backdropFilter: "blur(24px) saturate(1.5)",
          WebkitBackdropFilter: "blur(24px) saturate(1.5)",
          borderTop: "1px solid rgba(201, 168, 76, 0.25)",
          borderRadius: "16px 16px 0 0",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          maxHeight: "70dvh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Sheet drag handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: "10px",
            paddingBottom: "6px",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <div
            style={{
              width: "36px",
              height: "4px",
              borderRadius: "2px",
              background: "rgba(201, 168, 76, 0.3)",
            }}
          />
        </div>

        {/* Gold accent line */}
        <div
          style={{
            height: "1px",
            background: "linear-gradient(to right, transparent 0%, rgba(201,168,76,0.5) 20%, rgba(201,168,76,0.8) 50%, rgba(201,168,76,0.5) 80%, transparent 100%)",
            flexShrink: 0,
          }}
          aria-hidden="true"
        />

        {/* Sheet header */}
        <div
          style={{
            padding: "12px 16px 8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <TowerIcon />
          <span
            style={{
              ...monoStyle,
              fontSize: "10px",
              color: "rgba(201, 168, 76, 0.7)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
            }}
          >
            THE TOWER — SELECT FLOOR
          </span>
          <button
            onClick={dismiss}
            aria-label="Close floor navigation"
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "44px",
              minHeight: "44px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Floor list */}
        <div
          style={{
            overflowY: "auto",
            padding: "4px 8px 16px",
            flex: 1,
          }}
        >
          {sheetFloorItems}
        </div>
      </div>

      {/* ── Fixed Bottom Bar (always visible on mobile) ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[30] md:hidden"
        role="navigation"
        aria-label="Floor navigation"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div
          className="glass-liquid-gold"
          style={{
            borderTop: "1px solid rgba(201, 168, 76, 0.2)",
            borderRadius: 0,
            boxShadow: "0 -4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,168,76,0.08)",
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
            {/* Expand button — current floor indicator */}
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Close floor menu" : "Open floor menu"}
              aria-expanded={expanded}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginRight: "4px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                minWidth: "44px",
                minHeight: "44px",
                borderRadius: "8px",
              }}
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
              {/* Chevron */}
              <svg
                width="10"
                height="6"
                viewBox="0 0 10 6"
                fill="none"
                aria-hidden="true"
                style={{
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.25s ease",
                  marginTop: "2px",
                }}
              >
                <path
                  d="M1 5L5 1L9 5"
                  stroke="rgba(201,168,76,0.6)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

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

            {/* Current floor name */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div
                style={{
                  fontFamily: "'Satoshi', system-ui, sans-serif",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  fontWeight: 500,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activeFloorData?.name ?? activeFloor}
              </div>
              <div
                style={{
                  ...monoStyle,
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                  marginTop: "2px",
                }}
              >
                {activeFloorData?.label ?? ""}
              </div>
            </div>

            {/* Quick-access: most recent floors (compact) */}
            <div
              className="flex items-center gap-1"
              aria-label="Quick floor access"
            >
              {FLOOR_ORDER.slice(0, 4).map((floorId) => {
                const floor = FLOORS.find((f) => f.id === floorId);
                if (!floor) return null;
                const isActive = floorId === activeFloor;
                return (
                  <ElevatorButton
                    key={floorId}
                    floor={floor}
                    isActive={isActive}
                    isTransitioning={isTransitioning}
                    size="sm"
                    onClick={handleNavigate}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
