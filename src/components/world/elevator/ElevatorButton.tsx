"use client";

import { useMemo, type JSX } from "react";
import type { FloorId, Floor } from "@/lib/constants/floors";

interface ElevatorButtonProps {
  floor: Floor;
  isActive: boolean;
  isTransitioning: boolean;
  /** Size variant: desktop panel uses "md", mobile bar uses "sm" */
  size?: "md" | "sm";
  onClick: (floorId: FloorId) => void;
}

/** Exit-door SVG icon for the Lobby button. */
function ExitIcon({ size }: { size: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.25 12.25H2.92C2.39 12.25 1.75 11.69 1.75 11.08V2.92C1.75 2.31 2.39 1.75 2.92 1.75H5.25M9.33 9.92L12.25 7L9.33 4.08M12.25 7H5.25"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * ElevatorButton — single floor button with tooltip (desktop) or plain
 * button (mobile).  Tooltip visibility is handled by pure CSS via the
 * `.elevator-btn-wrap:hover .elevator-tooltip` selector injected in
 * Elevator.tsx's ELEVATOR_STYLES block.
 */
export function ElevatorButton({
  floor,
  isActive,
  isTransitioning,
  size = "md",
  onClick,
}: ElevatorButtonProps): JSX.Element {
  const { id: floorId, name, label, phase } = floor;
  const isLobby = floorId === "L";
  const isLocked = phase > 0;

  // Mobile (sm): 44x44px minimum touch target per WCAG guidelines
  const btnSizeClass = size === "md" ? "w-9 h-9" : "w-11 h-11";

  /** Static button style derived from floor state — recalculated only on relevant changes. */
  const baseStyle = useMemo((): React.CSSProperties => {
    if (isActive) {
      return { background: "var(--gold)", color: "var(--tower-darkest)" };
    }
    if (isLobby) {
      return {
        color: "var(--text-secondary)",
        border: "1px solid rgba(201, 168, 76, 0.25)",
      };
    }
    if (isLocked) {
      return { color: "var(--text-muted)", opacity: 0.55 };
    }
    return { color: "var(--text-secondary)" };
  }, [isActive, isLobby, isLocked]);

  /** Restore base inline style on mouse-leave. */
  function handleMouseLeave(e: React.MouseEvent<HTMLButtonElement>): void {
    if (isActive || isTransitioning) return;
    const el = e.currentTarget;
    el.style.border = isLobby ? "1px solid rgba(201, 168, 76, 0.25)" : "";
    el.style.color = isLocked ? "var(--text-muted)" : "var(--text-secondary)";
    el.style.background = "";
    el.style.opacity = isLocked ? "0.55" : "";
    el.style.transform = "";
    el.style.boxShadow = "";
  }

  /** Apply hover styles on mouse-enter. */
  function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>): void {
    if (isActive || isTransitioning) return;
    const el = e.currentTarget;
    el.style.border = "1px solid rgba(201, 168, 76, 0.3)";
    el.style.color = "var(--text-primary)";
    el.style.background = "rgba(201, 168, 76, 0.05)";
    el.style.opacity = "1";
    el.style.transform = "scale(1.08)";
    el.style.boxShadow = "0 0 12px rgba(201, 168, 76, 0.15)";
  }

  const ariaLabel = `${name} — ${label}${isLocked ? " (Under Construction)" : ""}`;

  const buttonContent: JSX.Element = isLobby ? (
    <ExitIcon size={size === "md" ? 14 : 12} />
  ) : floorId === "PH" ? (
    <span className={size === "md" ? "text-[10px] leading-none" : "text-[9px] leading-none"}>
      PH
    </span>
  ) : (
    <>{floorId}</>
  );

  const button = (
    <button
      onClick={() => onClick(floorId)}
      disabled={isTransitioning || isActive}
      aria-label={ariaLabel}
      aria-current={isActive ? "page" : undefined}
      className={[
        `${btnSizeClass} rounded-full flex items-center justify-center`,
        "text-data text-xs font-medium transition-all duration-200",
        "focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-2",
        isActive ? "elevator-active-btn" : "",
        isLobby && size === "md" ? "mt-2" : "",
        isTransitioning ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ]
        .filter(Boolean)
        .join(" ")}
      style={baseStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {buttonContent}
    </button>
  );

  // Desktop variant: wrap in tooltip container
  if (size === "md") {
    return (
      <div className="elevator-btn-wrap">
        {button}
        {/* Custom CSS tooltip — glass panel to the right */}
        <div className="elevator-tooltip" role="tooltip" aria-hidden="true">
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
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "var(--text-primary)",
                lineHeight: 1.3,
                whiteSpace: "nowrap",
              }}
            >
              {isLobby ? "Exit to Lobby" : name}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "9px",
                color: isLocked
                  ? "rgba(201, 168, 76, 0.4)"
                  : "rgba(201, 168, 76, 0.65)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginTop: "1px",
              }}
            >
              {isLocked ? `Phase ${phase} • Coming Soon` : label}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile variant: plain button, no tooltip wrapper
  return button;
}
