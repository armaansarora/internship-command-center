"use client";

import type { JSX } from "react";
import type { StarHints } from "../star/extract-star";

interface Props {
  hints: StarHints;
}

const COLS: Array<{ key: keyof StarHints; label: string; color: string; glyph: string }> = [
  { key: "situation", label: "Situation", color: "#4A9EDB", glyph: "S" },
  { key: "task",      label: "Task",      color: "#7EC8E3", glyph: "T" },
  { key: "action",    label: "Action",    color: "#00E5FF", glyph: "A" },
  { key: "result",    label: "Result",    color: "#00CC88", glyph: "R" },
];

export function LiveSTARBoard({ hints }: Props): JSX.Element {
  return (
    <div
      role="region"
      aria-label="Live STAR whiteboard"
      className="grid grid-cols-4 gap-2 p-4 rounded-sm"
      style={{
        background: "#090F1C",
        border: "1px solid #1A2E4A",
        boxShadow: "inset 0 0 24px rgba(74,158,219,0.04)",
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
        minHeight: "220px",
      }}
    >
      {COLS.map(({ key, label, color, glyph }) => {
        const entries = hints[key];
        return (
          <div
            key={key}
            className="flex flex-col gap-2"
            style={{
              borderRight: key === "result" ? "none" : "1px dashed rgba(74,158,219,0.2)",
              paddingRight: 8,
            }}
          >
            <div style={{ fontSize: 24, color, fontWeight: 700, lineHeight: 1 }} aria-hidden>
              {glyph}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "#4A6A85",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
            <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-1">
              {entries.length === 0 ? (
                <span style={{ fontSize: 14, color: "#2D4A62" }} aria-hidden>—</span>
              ) : (
                entries.map((entry, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      color: "#E8F4FD",
                      backgroundColor: `${color}14`,
                      borderLeft: `2px solid ${color}`,
                      padding: "3px 6px",
                      borderRadius: "0 2px 2px 0",
                      transition: "background-color 0.25s ease-out",
                    }}
                  >
                    {entry}
                  </span>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
