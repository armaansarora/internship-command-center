"use client";

import type { JSX } from "react";
import { useState } from "react";

interface HeatmapDay {
  date: string;    // ISO string e.g. "2026-03-20"
  count: number;
}

interface ActivityHeatmapProps {
  /** 28 days of activity data (4 weeks × 7 days) */
  data?: HeatmapDay[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKS = 4;
const DAYS = 7;

function generateDefaultData(): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const now = new Date();
  for (let i = WEEKS * DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    // Deterministic fake data: weekdays more active
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const seed = (d.getDate() * 7 + d.getMonth()) % 10;
    const count = isWeekend ? (seed < 3 ? 0 : 1) : Math.max(0, seed - 2);
    days.push({
      date: d.toISOString().split("T")[0] ?? d.toLocaleDateString(),
      count,
    });
  }
  return days;
}

function intensityColor(count: number, max: number): string {
  if (count === 0) return "rgba(60, 140, 220, 0.05)";
  const ratio = count / Math.max(max, 1);
  if (ratio < 0.25)  return "rgba(60, 140, 220, 0.2)";
  if (ratio < 0.5)   return "rgba(60, 140, 220, 0.45)";
  if (ratio < 0.75)  return "rgba(60, 140, 220, 0.65)";
  return "rgba(60, 140, 220, 0.9)";
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/**
 * ActivityHeatmap — 7×4 grid (4 weeks × 7 days) showing daily activity.
 * Color intensity based on action count. Tooltip on hover.
 */
export function ActivityHeatmap({ data }: ActivityHeatmapProps): JSX.Element {
  const cellData = data && data.length >= WEEKS * DAYS
    ? data.slice(-WEEKS * DAYS)
    : generateDefaultData();

  const maxCount = Math.max(...cellData.map((d) => d.count), 1);

  const [tooltip, setTooltip] = useState<{ date: string; count: number } | null>(null);

  return (
    <div
      role="img"
      aria-label="Activity heatmap showing daily pipeline actions over the last 4 weeks"
      style={{ width: "100%", position: "relative" }}
    >
      {/* Day labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `32px repeat(${WEEKS}, 1fr)`,
          gap: "3px",
          marginBottom: "4px",
        }}
        aria-hidden="true"
      >
        <div />
        {Array.from({ length: WEEKS }, (_, w) => (
          <div
            key={w}
            style={{
              fontSize: "8px",
              fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
              color: "rgba(74, 122, 155, 0.6)",
              textAlign: "center",
            }}
          >
            W{WEEKS - w}
          </div>
        ))}
      </div>

      {/* Grid */}
      {Array.from({ length: DAYS }, (_, dayIdx) => (
        <div
          key={dayIdx}
          style={{
            display: "grid",
            gridTemplateColumns: `32px repeat(${WEEKS}, 1fr)`,
            gap: "3px",
            marginBottom: "3px",
          }}
        >
          {/* Day label */}
          <div
            aria-hidden="true"
            style={{
              fontSize: "8px",
              fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
              color: "rgba(74, 122, 155, 0.6)",
              lineHeight: "18px",
              textAlign: "right",
              paddingRight: "4px",
            }}
          >
            {DAY_LABELS[dayIdx]}
          </div>

          {/* Week cells for this day */}
          {Array.from({ length: WEEKS }, (_, weekIdx) => {
            const cellIdx = weekIdx * DAYS + dayIdx;
            const cell = cellData[cellIdx] ?? { date: "", count: 0 };
            const color = intensityColor(cell.count, maxCount);
            const isHovered = tooltip?.date === cell.date;

            return (
              <button
                key={weekIdx}
                type="button"
                aria-label={`${formatDate(cell.date)}: ${cell.count} action${cell.count !== 1 ? "s" : ""}`}
                onMouseEnter={() => setTooltip({ date: cell.date, count: cell.count })}
                onMouseLeave={() => setTooltip(null)}
                onFocus={() => setTooltip({ date: cell.date, count: cell.count })}
                onBlur={() => setTooltip(null)}
                style={{
                  height: "18px",
                  borderRadius: "2px",
                  background: color,
                  border: isHovered
                    ? "1px solid rgba(100, 180, 255, 0.6)"
                    : "1px solid rgba(60, 140, 220, 0.1)",
                  cursor: "default",
                  transition: "transform 0.1s ease, border-color 0.1s ease",
                  transform: isHovered ? "scale(1.15)" : "scale(1)",
                  padding: 0,
                  outline: "none",
                }}
                className="obs-heatmap-cell"
              />
            );
          })}
        </div>
      ))}

      {/* Tooltip */}
      {tooltip && tooltip.date && (
        <div
          role="tooltip"
          aria-live="polite"
          style={{
            position: "absolute",
            bottom: "-28px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(12, 26, 46, 0.95)",
            border: "1px solid rgba(60, 140, 220, 0.35)",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "10px",
            fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
            color: "rgba(168, 216, 255, 0.9)",
            whiteSpace: "nowrap",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {formatDate(tooltip.date)} — {tooltip.count} action{tooltip.count !== 1 ? "s" : ""}
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginTop: "8px",
          justifyContent: "flex-end",
        }}
        aria-hidden="true"
      >
        <span style={{ fontSize: "8px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(74, 122, 155, 0.6)" }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <div
            key={ratio}
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "2px",
              background: intensityColor(Math.round(ratio * maxCount), maxCount),
              border: "1px solid rgba(60, 140, 220, 0.1)",
            }}
          />
        ))}
        <span style={{ fontSize: "8px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(74, 122, 155, 0.6)" }}>More</span>
      </div>
    </div>
  );
}
