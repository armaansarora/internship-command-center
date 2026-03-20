"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface CSuiteStats {
  pipelineTotal: number;
  offers: number;
  screening: number;
  staleCount: number;
  weeklyActivity: number;
}

interface CSuiteTickerProps {
  stats: CSuiteStats;
  agentSummaries?: Array<{ name: string; summary: string }>;
}

const DEFAULT_SUMMARIES = [
  { name: "CRO", summary: "Pipeline healthy" },
  { name: "COO", summary: "2 follow-ups due" },
  { name: "CNO", summary: "3 contacts cooling" },
  { name: "CIO", summary: "Intel current" },
  { name: "CMO", summary: "Content queue active" },
  { name: "CPO", summary: "Strategy on track" },
];

export function CSuiteTicker({ stats, agentSummaries = DEFAULT_SUMMARIES }: CSuiteTickerProps): JSX.Element {
  const reducedMotion = useReducedMotion();

  const segments = useMemo(() => {
    const agentSegs = agentSummaries.map((a) => ({
      label: a.name,
      value: a.summary,
      isAgent: true,
    }));
    const statSegs = [
      { label: "PIPELINE", value: stats.pipelineTotal.toString(), isAgent: false },
      { label: "OFFERS",   value: stats.offers.toString(), isAgent: false },
      { label: "STALE",    value: stats.staleCount.toString(), isAgent: false },
      { label: "WK DELTA", value: `+${stats.weeklyActivity}`, isAgent: false },
    ];
    return [...agentSegs, ...statSegs];
  }, [stats, agentSummaries]);

  const doubled = useMemo(() => [...segments, ...segments], [segments]);

  return (
    <div
      className="csuite-ticker"
      role="status"
      aria-label="C-Suite agent activity feed"
      style={{ height: "32px", display: "flex", alignItems: "center", overflow: "hidden" }}
    >
      {/* Left label */}
      <div
        aria-hidden="true"
        style={{
          flexShrink: 0,
          padding: "0 12px",
          borderRight: "1px solid rgba(201, 168, 76, 0.2)",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(10, 8, 3, 0.95)",
          zIndex: 1,
        }}
      >
        <span
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: "rgba(201, 168, 76, 0.9)",
            boxShadow: "0 0 6px rgba(201, 168, 76, 0.6)",
            display: "inline-block",
            animation: reducedMotion ? "none" : "cs-glow-pulse 2.4s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: "9px",
            fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
            color: "rgba(201, 168, 76, 0.9)",
            letterSpacing: "0.1em",
            fontWeight: 700,
          }}
        >
          C-SUITE
        </span>
      </div>

      {/* Scrolling content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div
          className={reducedMotion ? "" : "csuite-ticker-track"}
          style={reducedMotion ? { display: "flex" } : undefined}
          aria-hidden="true"
        >
          {doubled.map((seg, i) => (
            <div
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "0 14px",
                borderRight: "1px solid rgba(201, 168, 76, 0.08)",
              }}
            >
              <span
                style={{
                  fontSize: "9px",
                  fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
                  color: seg.isAgent ? "rgba(201, 168, 76, 0.7)" : "rgba(107, 83, 32, 0.9)",
                  letterSpacing: "0.08em",
                  fontWeight: seg.isAgent ? 700 : 400,
                }}
              >
                {seg.label}:
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
                  color: "rgba(245, 232, 192, 0.85)",
                  letterSpacing: "0.04em",
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
