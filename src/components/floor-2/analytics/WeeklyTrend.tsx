"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface WeeklyTrendProps {
  /** Array of weekly application counts — most recent last */
  data?: number[];
  /** Week labels */
  labels?: string[];
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function buildAreaPath(points: { x: number; y: number }[], svgHeight: number, padBottom: number): string {
  if (points.length === 0) return "";
  const linePath = buildPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${linePath} L ${last.x.toFixed(1)} ${(svgHeight - padBottom).toFixed(1)} L ${first.x.toFixed(1)} ${(svgHeight - padBottom).toFixed(1)} Z`;
}

const DEFAULT_DATA = [2, 4, 3, 6, 5, 8, 7, 10];
const DEFAULT_LABELS = ["W-8", "W-7", "W-6", "W-5", "W-4", "W-3", "W-2", "W-1"];

/**
 * WeeklyTrend — SVG line chart showing applications per week over 8 weeks.
 * Animated draw-in. Pure SVG, no chart library.
 */
export function WeeklyTrend({ data = DEFAULT_DATA, labels = DEFAULT_LABELS }: WeeklyTrendProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState<number>(0);
  const [animated, setAnimated] = useState(false);

  const svgWidth = 280;
  const svgHeight = 120;
  const padLeft = 28;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 20;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const maxVal = Math.max(...data, 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const points = data.map((val, i) => ({
    x: padLeft + (i / (data.length - 1)) * chartWidth,
    y: padTop + chartHeight - ((val - minVal) / range) * chartHeight,
  }));

  const linePath = buildPath(points);
  const areaPath = buildAreaPath(points, svgHeight, padBottom);

  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength();
      setPathLength(len);
      setAnimated(true);
    }
  }, []);

  const strokeDashArray = pathLength > 0 ? pathLength.toString() : "1000";
  const strokeDashOffset = animated && !reducedMotion ? "0" : strokeDashArray;

  // Y-axis grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: padTop + chartHeight * (1 - pct),
    label: Math.round(minVal + range * pct).toString(),
  }));

  return (
    <div
      role="img"
      aria-label="Weekly trend line chart showing applications submitted per week"
      style={{ width: "100%" }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="obs-trend-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(60, 140, 220, 0.25)" />
            <stop offset="100%" stopColor="rgba(60, 140, 220, 0)" />
          </linearGradient>
          <filter id="obs-line-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Y-axis grid lines */}
        {gridLines.map((gl) => (
          <g key={gl.y}>
            <line
              x1={padLeft}
              y1={gl.y}
              x2={svgWidth - padRight}
              y2={gl.y}
              stroke="rgba(60, 140, 220, 0.1)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={padLeft - 4}
              y={gl.y + 3}
              fill="rgba(74, 122, 155, 0.8)"
              fontSize="8"
              fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
              textAnchor="end"
            >
              {gl.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#obs-trend-area)" />

        {/* Line */}
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke="rgba(60, 140, 220, 0.9)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#obs-line-glow)"
          strokeDasharray={strokeDashArray}
          strokeDashoffset={strokeDashOffset}
          style={{
            transition: reducedMotion ? "none" : "stroke-dashoffset 1.4s ease-out",
          }}
        />

        {/* Data points */}
        {points.map((pt, i) => (
          <g key={i}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              fill="rgba(60, 140, 220, 0.9)"
              stroke="rgba(5, 11, 18, 0.9)"
              strokeWidth="1.5"
              filter="url(#obs-line-glow)"
            />
            {/* Week label */}
            <text
              x={pt.x}
              y={svgHeight - padBottom + 12}
              fill="rgba(74, 122, 155, 0.7)"
              fontSize="7.5"
              fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
              textAnchor="middle"
            >
              {labels[i] ?? `W${i + 1}`}
            </text>
            {/* Value label on last point */}
            {i === data.length - 1 && (
              <text
                x={pt.x + 6}
                y={pt.y - 6}
                fill="rgba(100, 180, 255, 0.95)"
                fontSize="9"
                fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
                fontWeight="700"
              >
                {data[i]}
              </text>
            )}
          </g>
        ))}
      </svg>

      <p className="sr-only">
        Weekly applications: {data.map((d, i) => `${labels[i] ?? `Week ${i + 1}`}: ${d}`).join(", ")}
      </p>
    </div>
  );
}
