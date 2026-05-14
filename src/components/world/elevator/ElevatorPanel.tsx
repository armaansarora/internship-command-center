"use client";

import { useMemo, useState, useRef, useCallback, useEffect, type JSX } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, X } from "lucide-react";
import { FLOORS, FLOOR_ORDER, type FloorId } from "@/lib/constants/floors";
import { ElevatorButton } from "./ElevatorButton";

/** Minimum applications + days of history before the Observatory unlocks. */
const OBSERVATORY_MIN_APPS = 5;
const OBSERVATORY_MIN_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Pure helpers for the gauntlet gates — exported so tests can pin the
 * gate logic without rendering React. Kept tiny and explicit; the goal
 * is "show nothing until the user has earned the unlock," so unknown
 * inputs (negative counts, null timestamps, future-dated rows) collapse
 * to the safe `false` path rather than throwing.
 */
export function isObservatoryUnlocked(
  appCount: number,
  firstAppliedAt: string | null,
  now: Date = new Date(),
): boolean {
  if (appCount < OBSERVATORY_MIN_APPS) return false;
  if (!firstAppliedAt) return false;
  const parsed = new Date(firstAppliedAt);
  if (Number.isNaN(parsed.getTime())) return false;
  // Elapsed hours, NOT calendar days: a user who applies at 23:55 local and
  // reloads at 00:05 seven days later sees ageDays ≈ 6.0 (locked), which is
  // intentional. Tests pin the "exactly 7×24h" boundary — do not "fix" this
  // into a date-only diff.
  const ageDays = (now.getTime() - parsed.getTime()) / MS_PER_DAY;
  return ageDays >= OBSERVATORY_MIN_DAYS;
}

export function isParlorUnlocked(offerCount: number): boolean {
  return offerCount > 0;
}

interface ElevatorPanelProps {
  activeFloor: FloorId;
  isTransitioning: boolean;
  onNavigate: (floorId: FloorId) => void;
  offerCount: number;
  appCount: number;
  firstAppliedAt: string | null;
}

function TowerIcon(): JSX.Element {
  return (
    <span
      aria-hidden="true"
      style={{ position: "relative", display: "inline-block", width: "16px", height: "20px", flexShrink: 0 }}
    >
      <span style={{ position: "absolute", left: 6.5, top: 0, width: 3, height: 3, background: "rgba(201,168,76,0.9)" }} />
      <span style={{ position: "absolute", left: 5, top: 3, width: 6, height: 2, background: "rgba(201,168,76,0.85)" }} />
      <span style={{ position: "absolute", left: 3.5, top: 5, width: 9, height: 10, border: "1px solid rgba(201,168,76,0.6)", background: "rgba(201,168,76,0.25)" }} />
      {[7, 10.5].map((top) => (
        <span key={top} style={{ position: "absolute", left: 5.5, top, width: 5, height: 2, background: "linear-gradient(90deg, rgba(201,168,76,0.5) 0 40%, transparent 40% 60%, rgba(201,168,76,0.5) 60%)" }} />
      ))}
      <span style={{ position: "absolute", left: 2, top: 15, width: 12, height: 2, background: "rgba(201,168,76,0.5)" }} />
      <span style={{ position: "absolute", left: 0, top: 17, width: 16, height: 2, background: "rgba(201,168,76,0.4)" }} />
    </span>
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
  offerCount,
  appCount,
  firstAppliedAt,
}: ElevatorPanelProps): JSX.Element {
  const router = useRouter();
  const activeFloorData = useMemo(
    () => FLOORS.find((f) => f.id === activeFloor),
    [activeFloor],
  );

  const observatoryUnlocked = isObservatoryUnlocked(appCount, firstAppliedAt);
  const parlorUnlocked = isParlorUnlocked(offerCount);

  const visibleFloorOrder = useMemo(
    () =>
      FLOOR_ORDER.filter((floorId) => {
        if (floorId === "2" && !observatoryUnlocked) return false;
        return true;
      }),
    [observatoryUnlocked],
  );

  const floorButtons = useMemo(
    () =>
      visibleFloorOrder.map((floorId) => {
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
    [visibleFloorOrder, activeFloor, isTransitioning, onNavigate],
  );

  const handleParlorClick = useCallback(() => {
    if (isTransitioning) return;
    router.push("/parlor");
  }, [router, isTransitioning]);

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

        {/* ── Parlor Annex Button ──
            Rendered ONLY when the user has at least one offer. The Parlor
            is an off-elevator annex on the C-Suite floor, so the route is
            pushed directly through next/router rather than the elevator's
            floor-transition state machine. The /parlor route also
            redirects to /c-suite when offerCount===0 (see
            r10-parlor-route-gate.proof.test.ts) — the button is the
            first line of defence, the redirect is the safety net. */}
        {parlorUnlocked && (
          <div className="elevator-btn-wrap">
            <button
              type="button"
              onClick={handleParlorClick}
              disabled={isTransitioning}
              aria-label="The Negotiation Parlor — Offers"
              data-elevator-button="parlor"
              className={[
                "w-9 h-9 rounded-full flex items-center justify-center",
                "text-data text-xs font-medium transition-all duration-200",
                "focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-2",
                isTransitioning
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer",
              ].join(" ")}
              style={{
                color: "var(--text-secondary)",
                border: "1px solid rgba(201, 168, 76, 0.45)",
                marginTop: "2px",
              }}
            >
              <span
                style={{ ...monoStyle, fontSize: "10px", lineHeight: 1 }}
              >
                NP
              </span>
            </button>
            <div
              className="elevator-tooltip"
              role="tooltip"
              aria-hidden="true"
            >
              <div
                style={{
                  background: "rgba(10, 12, 25, 0.92)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(201, 168, 76, 0.15)",
                  borderLeft: "2px solid rgba(201, 168, 76, 0.7)",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  boxShadow:
                    "0 4px 16px rgba(0,0,0,0.5), 0 0 8px rgba(201,168,76,0.06)",
                }}
              >
                <div
                  style={{
                    ...monoStyle,
                    fontSize: "11px",
                    color: "var(--text-primary)",
                    lineHeight: 1.3,
                    whiteSpace: "nowrap",
                  }}
                >
                  The Negotiation Parlor
                </div>
                <div
                  style={{
                    ...monoStyle,
                    fontSize: "9px",
                    color: "rgba(201, 168, 76, 0.65)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginTop: "1px",
                  }}
                >
                  Offers
                </div>
              </div>
            </div>
          </div>
        )}

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
  offerCount,
  appCount,
  firstAppliedAt,
}: ElevatorPanelProps): JSX.Element {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const activeFloorData = useMemo(
    () => FLOORS.find((f) => f.id === activeFloor),
    [activeFloor],
  );

  const observatoryUnlocked = isObservatoryUnlocked(appCount, firstAppliedAt);
  const parlorUnlocked = isParlorUnlocked(offerCount);

  const visibleFloorOrder = useMemo(
    () =>
      FLOOR_ORDER.filter((floorId) => {
        if (floorId === "2" && !observatoryUnlocked) return false;
        return true;
      }),
    [observatoryUnlocked],
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

  const handleParlorNavigate = useCallback(() => {
    setExpanded(false);
    if (isTransitioning) return;
    router.push("/parlor");
  }, [router, isTransitioning]);

  // All floor buttons for the sheet (with names visible)
  const sheetFloorItems = useMemo(
    () =>
      visibleFloorOrder.map((floorId) => {
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
    [visibleFloorOrder, activeFloor, isTransitioning, handleNavigate],
  );

  /**
   * Optional Parlor entry appended at the bottom of the floor sheet. Only
   * surfaces when the user has at least one offer. Visually mirrors the
   * regular floor row so it slots in without re-architecting the sheet.
   */
  const parlorSheetItem = parlorUnlocked ? (
    <button
      key="parlor"
      onClick={handleParlorNavigate}
      disabled={isTransitioning}
      aria-label="The Negotiation Parlor — Offers"
      data-elevator-button="parlor"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        padding: "10px 16px",
        background: "transparent",
        border: "none",
        borderRadius: "8px",
        cursor: isTransitioning ? "default" : "pointer",
        opacity: isTransitioning ? 0.5 : 1,
        minHeight: "44px",
      }}
    >
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
          background: "rgba(255,255,255,0.06)",
          color: "var(--text-secondary)",
          flexShrink: 0,
          border: "1px solid rgba(201, 168, 76, 0.45)",
        }}
      >
        NP
      </span>
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "2px",
        }}
      >
        <span
          style={{
            fontFamily: "'Satoshi', system-ui, sans-serif",
            fontSize: "14px",
            color: "var(--text-primary)",
            fontWeight: 400,
            lineHeight: 1.2,
          }}
        >
          The Negotiation Parlor
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
          Offers
        </span>
      </span>
    </button>
  ) : null;

  return (
    <>
      {/* ── Backdrop (when expanded) ── */}
      {expanded && (
        <div
          className="fixed inset-0 z-[28] lg:hidden"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
          onClick={dismiss}
          aria-hidden="true"
        />
      )}

      {/* ── Bottom Sheet (expanded floor list) ──
          Render only while expanded so closed navigation is not exposed as
          a hidden dialog with tabbable offscreen buttons. */}
      {expanded && (
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[29] lg:hidden"
        role="dialog"
        aria-label="Floor navigation"
        aria-modal="true"
        style={{
          transform: "translateY(0)",
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
            <X size={16} strokeWidth={1.5} aria-hidden="true" />
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
          {parlorSheetItem}
        </div>
      </div>
      )}

      {/* ── Fixed Bottom Bar (always visible on mobile) ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[30] lg:hidden"
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
              <ChevronUp
                size={12}
                strokeWidth={1.5}
                aria-hidden="true"
                style={{
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.25s ease",
                  marginTop: "2px",
                  color: "rgba(201,168,76,0.6)",
                }}
              />
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
