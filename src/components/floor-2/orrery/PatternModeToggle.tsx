"use client";

import type { CSSProperties, JSX, KeyboardEvent } from "react";
import type { PatternMode } from "@/lib/orrery/types";

/**
 * PatternModeToggle.
 *
 * Three-button glass pill that flips the Orrery between layout modes:
 *   stage    — radius by tier, color by pipeline status (default)
 *   tier     — radius by tier, color by tier brightness
 *   velocity — radius by recency, color by warmth bucket
 *
 * Pure UI: state lives upstream (Orrery owns it via useOrreryMode → localStorage).
 * The pill speaks to the screen reader as a `role="group"` of three toggles
 * with `aria-pressed` reflecting the active mode. Arrow keys cycle through
 * the modes when focus is inside the group, wrapping at both ends.
 *
 * Visual: ~28px tall pill, glass surface (rgba(26,26,46,0.6)) with a soft
 * cool-blue border. Active button gets the Tower-gold (#C9A84C) outline plus
 * a brighter background. No GSAP — the morph between layouts happens in the
 * render layer (CSS transitions on `.orrery-planet`), not here.
 */

const TOWER_GOLD = "#C9A84C";
const COOL_BLUE_BORDER = "rgba(60, 140, 220, 0.20)";
const GLASS_BG = "rgba(26, 26, 46, 0.60)";
const ACTIVE_BG = "rgba(40, 40, 70, 0.85)";
const TEXT_DIM = "rgba(168, 216, 255, 0.75)";
const TEXT_ACTIVE = TOWER_GOLD;

interface ModeOption {
  mode: PatternMode;
  label: string;
}

const OPTIONS: readonly ModeOption[] = [
  { mode: "stage", label: "By Stage" },
  { mode: "tier", label: "By Tier" },
  { mode: "velocity", label: "By Velocity" },
] as const;

interface Props {
  mode: PatternMode;
  onChange: (mode: PatternMode) => void;
}

const groupStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "stretch",
  background: GLASS_BG,
  border: `1px solid ${COOL_BLUE_BORDER}`,
  borderRadius: "999px",
  padding: "3px",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  fontFamily: "JetBrains Mono, monospace",
};

function buttonStyle(active: boolean): CSSProperties {
  return {
    border: active ? `1px solid ${TOWER_GOLD}` : "1px solid transparent",
    background: active ? ACTIVE_BG : "transparent",
    color: active ? TEXT_ACTIVE : TEXT_DIM,
    padding: "5px 14px",
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderRadius: "999px",
    cursor: "pointer",
    transition:
      "color 200ms ease-out, background 200ms ease-out, border-color 200ms ease-out",
    fontFamily: "inherit",
    lineHeight: 1.2,
  };
}

export function PatternModeToggle({ mode, onChange }: Props): JSX.Element {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const idx = OPTIONS.findIndex((opt) => opt.mode === mode);
    if (idx < 0) return;
    const len = OPTIONS.length;
    const nextIdx =
      event.key === "ArrowRight" ? (idx + 1) % len : (idx - 1 + len) % len;
    const next = OPTIONS[nextIdx];
    if (next) {
      event.preventDefault();
      onChange(next.mode);
    }
  }

  return (
    <div
      role="group"
      aria-label="Orrery pattern mode"
      style={groupStyle}
      onKeyDown={handleKeyDown}
    >
      {OPTIONS.map((opt) => {
        const active = opt.mode === mode;
        return (
          <button
            key={opt.mode}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.mode)}
            style={buttonStyle(active)}
            data-orrery-mode-button={opt.mode}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
