"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface WeeklyTrendProps {
  /** Array of weekly application counts — most recent last */
  data?: number[];
  /** Week labels */
  labels?: string[];
}

const DEFAULT_DATA = [2, 4, 3, 6, 5, 8, 7, 10];
const DEFAULT_LABELS = ["W-8", "W-7", "W-6", "W-5", "W-4", "W-3", "W-2", "W-1"];

export function WeeklyTrend({ data = DEFAULT_DATA, labels = DEFAULT_LABELS }: WeeklyTrendProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const [animated, setAnimated] = useState(false);
  const maxVal = Math.max(...data, 1);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setTimeout(() => setAnimated(true), 60);
    return () => window.clearTimeout(id);
  }, [reducedMotion]);

  return (
    <div
      role="img"
      aria-label="Weekly trend line chart showing applications submitted per week"
      style={{
        width: "100%",
        minHeight: "120px",
        display: "grid",
        gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
        gap: "8px",
        alignItems: "end",
        padding: "16px 4px 0",
        background:
          "linear-gradient(to top, rgba(60,140,220,0.08) 1px, transparent 1px), linear-gradient(to top, rgba(60,140,220,0.05) 50%, transparent 50%)",
        backgroundSize: "100% 25%, 100% 100%",
      }}
    >
      {data.map((value, i) => {
        const height = Math.max((value / maxVal) * 84, value > 0 ? 8 : 3);
        const renderedHeight = reducedMotion || animated ? height : 3;
        return (
          <div key={`${labels[i] ?? i}-${value}`} style={{ display: "grid", gap: "5px", alignItems: "end" }}>
            <div style={{ minHeight: "88px", display: "flex", alignItems: "end", justifyContent: "center" }}>
              <span
                aria-hidden="true"
                title={`${labels[i] ?? `Week ${i + 1}`}: ${value}`}
                style={{
                  width: "100%",
                  maxWidth: "18px",
                  height: `${renderedHeight}px`,
                  borderRadius: "999px 999px 3px 3px",
                  background: i === data.length - 1
                    ? "linear-gradient(180deg, rgba(100,180,255,0.96), rgba(60,140,220,0.46))"
                    : "linear-gradient(180deg, rgba(60,140,220,0.82), rgba(60,140,220,0.28))",
                  boxShadow: i === data.length - 1 ? "0 0 16px rgba(100,180,255,0.45)" : undefined,
                  transition: reducedMotion ? "none" : "height 1.1s ease-out",
                }}
              />
            </div>
            <span style={{ textAlign: "center", fontSize: "7.5px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(74, 122, 155, 0.7)" }}>
              {labels[i] ?? `W${i + 1}`}
            </span>
          </div>
        );
      })}

      <p className="sr-only">
        Weekly applications: {data.map((d, i) => `${labels[i] ?? `Week ${i + 1}`}: ${d}`).join(", ")}
      </p>
    </div>
  );
}
