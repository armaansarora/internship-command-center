"use client";

import type { JSX } from "react";
import { useCallback } from "react";

export interface StampOption {
  status: string;
  label: string;
  color: string;
}

const DEFAULT_OPTIONS: StampOption[] = [
  { status: "applied", label: "SUBMITTED", color: "#1E90FF" },
  { status: "screening", label: "SCREENING", color: "#00D4FF" },
  { status: "interview_scheduled", label: "INTERVIEW", color: "#F59E0B" },
  { status: "offer", label: "OFFER", color: "#00FF87" },
  { status: "rejected", label: "REJECTED", color: "#DC3C3C" },
  { status: "withdrawn", label: "ARCHIVED", color: "#4A7A9B" },
];

interface StampBarProps {
  selectionCount: number;
  onStamp: (status: string) => void | Promise<void>;
  onClear: () => void;
  disabled?: boolean;
  options?: StampOption[];
}

/**
 * Floating action bar that appears when the user has selected one or more
 * applications in the war table. Renders a rubber-stamp-shaped CTA per status.
 *
 * Visual language: wood-slab base, gold edge, mahogany undertone — matches
 * the Bloomberg-tactile provocation in the R1 brief ("rubber on a wooden
 * block"). No Kanban chrome, no colored-tag chips — just stamps you press.
 */
export function StampBar({
  selectionCount,
  onStamp,
  onClear,
  disabled = false,
  options = DEFAULT_OPTIONS,
}: StampBarProps): JSX.Element | null {
  const handleStamp = useCallback(
    (status: string) => () => {
      if (disabled || selectionCount === 0) return;
      void onStamp(status);
    },
    [disabled, selectionCount, onStamp]
  );

  if (selectionCount === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label={`Stamp ${selectionCount} selected application${
        selectionCount === 1 ? "" : "s"
      }`}
      style={{
        position: "fixed",
        bottom: "96px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 14px",
        borderRadius: "2px",
        background:
          "linear-gradient(180deg, rgba(42, 26, 16, 0.96) 0%, rgba(26, 16, 10, 0.98) 100%)",
        border: "1px solid #8B6F3A",
        boxShadow:
          "0 18px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(201, 168, 76, 0.3)",
        fontFamily: "IBM Plex Mono, monospace",
        color: "#F2E5C7",
        zIndex: 40,
        animation: "stampbar-rise 0.22s ease-out",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#C9A84C",
          fontWeight: 700,
        }}
      >
        STAMP · {selectionCount}
      </span>
      <span
        aria-hidden="true"
        style={{
          width: "1px",
          alignSelf: "stretch",
          background: "rgba(201, 168, 76, 0.25)",
          margin: "2px 2px",
        }}
      />
      {options.map((opt) => (
        <button
          key={opt.status}
          type="button"
          onClick={handleStamp(opt.status)}
          disabled={disabled}
          aria-label={`Stamp ${selectionCount} to ${opt.label}`}
          style={{
            appearance: "none",
            padding: "6px 10px",
            borderRadius: "1px",
            border: `1px solid ${opt.color}55`,
            background: `rgba(${hexToRgb(opt.color)}, 0.12)`,
            color: opt.color,
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.55 : 1,
            transition:
              "background 0.15s ease, border-color 0.15s ease, transform 0.05s ease",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            if (!disabled) {
              el.style.background = `rgba(${hexToRgb(opt.color)}, 0.22)`;
              el.style.borderColor = `${opt.color}99`;
            }
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = `rgba(${hexToRgb(opt.color)}, 0.12)`;
            el.style.borderColor = `${opt.color}55`;
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform =
              "translateY(1px)";
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform =
              "translateY(0)";
          }}
        >
          {opt.label}
        </button>
      ))}
      <span
        aria-hidden="true"
        style={{
          width: "1px",
          alignSelf: "stretch",
          background: "rgba(201, 168, 76, 0.2)",
          margin: "2px 2px",
        }}
      />
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        style={{
          appearance: "none",
          padding: "4px 8px",
          borderRadius: "1px",
          border: "1px solid rgba(242, 229, 199, 0.15)",
          background: "transparent",
          color: "#C9A84C",
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        CANCEL
      </button>
      <style>{`
        @keyframes stampbar-rise {
          from { opacity: 0.4; transform: translateX(-50%) translateY(12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes stampbar-rise {
            from { opacity: 0.4; transform: translateX(-50%); }
            to { opacity: 1; transform: translateX(-50%); }
          }
        }
      `}</style>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
