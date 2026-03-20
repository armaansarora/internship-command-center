"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface ObservatoryStats {
  total: number;
  conversionRate: number;
  weeklyActivity: number;
  staleCount: number;
  screening: number;
  interviewing: number;
  offers: number;
}

interface ObservatoryTickerProps {
  stats: ObservatoryStats;
}

interface TickerSegment {
  label: string;
  value: string;
  accent?: boolean;
}

function buildSegments(stats: ObservatoryStats): TickerSegment[] {
  const delta = stats.weeklyActivity > 0 ? `+${stats.weeklyActivity}` : "0";
  return [
    { label: "ACTIVE",    value: stats.total.toString() },
    { label: "CONV RATE", value: `${stats.conversionRate.toFixed(1)}%`, accent: stats.conversionRate >= 10 },
    { label: "IN SCREEN", value: stats.screening.toString() },
    { label: "IN INTV",   value: stats.interviewing.toString() },
    { label: "OFFERS",    value: stats.offers.toString(), accent: stats.offers > 0 },
    { label: "STALE OPS", value: stats.staleCount.toString(), accent: stats.staleCount > 5 },
    { label: "WK DELTA",  value: delta },
    { label: "VELOCITY",  value: "4.2 days/stage" },
  ];
}

export function ObservatoryTicker({ stats }: ObservatoryTickerProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const segments = useMemo(() => buildSegments(stats), [stats]);

  // Double the segments for seamless looping
  const doubledSegments = useMemo(() => [...segments, ...segments], [segments]);

  return (
    <div
      className="observatory-ticker"
      role="status"
      aria-label="Observatory live analytics feed"
      style={{
        height: "32px",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Left label */}
      <div
        aria-hidden="true"
        style={{
          flexShrink: 0,
          padding: "0 12px",
          borderRight: "1px solid rgba(60, 140, 220, 0.2)",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(5, 11, 18, 0.95)",
          zIndex: 1,
        }}
      >
        <span
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: "rgba(0, 212, 255, 0.9)",
            boxShadow: "0 0 6px rgba(0, 212, 255, 0.7)",
            display: "inline-block",
            animation: reducedMotion ? "none" : "obs-dot-pulse 2.4s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: "9px",
            fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
            color: "rgba(60, 140, 220, 0.9)",
            letterSpacing: "0.1em",
            fontWeight: 700,
          }}
        >
          OBSERVATORY
        </span>
      </div>

      {/* Scrolling content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div
          className={reducedMotion ? "" : "observatory-ticker-track"}
          style={reducedMotion ? { display: "flex", gap: "0" } : undefined}
          aria-hidden="true"
        >
          {doubledSegments.map((seg, i) => (
            <div
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "0 16px",
                borderRight: "1px solid rgba(60, 140, 220, 0.1)",
              }}
            >
              <span
                style={{
                  fontSize: "9px",
                  fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
                  color: "rgba(74, 122, 155, 0.8)",
                  letterSpacing: "0.08em",
                }}
              >
                {seg.label}:
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
                  color: seg.accent ? "rgba(0, 255, 135, 0.9)" : "rgba(100, 180, 255, 0.9)",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                {seg.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
