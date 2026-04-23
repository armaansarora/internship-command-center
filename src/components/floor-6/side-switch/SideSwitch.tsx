"use client";

import type { JSX, ReactNode } from "react";
import { useSideSwitch, type Side } from "./useSideSwitch";

interface Props {
  cnoSlot: ReactNode;
  cioSlot: ReactNode;
  initial?: Side;
}

/**
 * Floor 6 has two rooms — CNO's lounge (left) and CIO's library (right).
 * `[` and `]` pan the camera between them; a single outer container
 * translates horizontally by `-50%` to swing to CIO.  Below 1024px the
 * keyboard hint is replaced by two tab buttons for touch users.
 *
 * The visible hint at bottom-left ("[ CNO / CIO ]") is there for
 * discoverability — you can't accidentally learn a key-binding nobody
 * mentioned.
 */
export function SideSwitch({ cnoSlot, cioSlot, initial = "cno" }: Props): JSX.Element {
  const { side, setSide } = useSideSwitch(initial);
  const translateX = side === "cno" ? "0%" : "-50%";

  return (
    <div
      data-testid="side-switch-container"
      data-side={side}
      role="region"
      aria-label="Floor 6 — Rolodex Lounge. Two sides: CNO's lounge (left, press [) and CIO's library (right, press ])."
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "200%",
          height: "100%",
          display: "flex",
          transform: `translateX(${translateX})`,
          transition: "transform 0.7s cubic-bezier(0.65, 0, 0.35, 1)",
          willChange: "transform",
        }}
      >
        <div
          data-testid="side-switch-cno"
          style={{ width: "50%", height: "100%", flex: "0 0 50%" }}
          aria-hidden={side !== "cno"}
        >
          {cnoSlot}
        </div>
        <div
          data-testid="side-switch-cio"
          style={{ width: "50%", height: "100%", flex: "0 0 50%" }}
          aria-hidden={side !== "cio"}
        >
          {cioSlot}
        </div>
      </div>

      {/* Desktop — visible hint, low-contrast, bottom-left */}
      <div
        aria-hidden="true"
        className="side-switch-hint"
        style={{
          position: "absolute",
          bottom: 14,
          left: 16,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "#C9A84C",
          opacity: 0.55,
          pointerEvents: "none",
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: side === "cno" ? "#C9A84C" : "#7A5B35" }}>[ CNO</span>
        <span style={{ opacity: 0.4 }}>&nbsp;/&nbsp;</span>
        <span style={{ color: side === "cio" ? "#C9A84C" : "#7A5B35" }}>CIO ]</span>
      </div>

      {/* Mobile tab fallback (<1024px) — actual display:none/flex via CSS */}
      <div
        className="side-switch-mobile"
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={() => setSide("cno")}
          aria-pressed={side === "cno"}
          aria-label="Switch to CNO — networking lounge"
          style={sideButton(side === "cno")}
        >
          CNO
        </button>
        <button
          type="button"
          onClick={() => setSide("cio")}
          aria-pressed={side === "cio"}
          aria-label="Switch to CIO — research library"
          style={sideButton(side === "cio")}
        >
          CIO
        </button>
      </div>
    </div>
  );
}

function sideButton(active: boolean): React.CSSProperties {
  return {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    padding: "6px 10px",
    background: active ? "rgba(201, 168, 76, 0.18)" : "transparent",
    color: active ? "#C9A84C" : "#7A5B35",
    border: "1px solid rgba(201, 168, 76, 0.3)",
    cursor: "pointer",
    borderRadius: 2,
  };
}
