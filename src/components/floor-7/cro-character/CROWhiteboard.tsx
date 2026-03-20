"use client";

import type { JSX } from "react";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";

interface CROWhiteboardProps {
  stats: PipelineStats;
}

// Stage order and display labels
const PIPELINE_STAGES: Array<{ key: string; label: string; color: string }> = [
  { key: "applied", label: "APPLIED", color: "#1E90FF" },
  { key: "screening", label: "SCREEN", color: "#00D4FF" },
  { key: "interview_scheduled", label: "SCHED", color: "#F59E0B" },
  { key: "interviewing", label: "INTV", color: "#F59E0B" },
  { key: "under_review", label: "REVIEW", color: "#9B59B6" },
  { key: "offer", label: "OFFER", color: "#00FF87" },
];

// ---------------------------------------------------------------------------
// Pipeline funnel bar
// ---------------------------------------------------------------------------
function PipelineFunnelBar({ stats }: { stats: PipelineStats }): JSX.Element {
  const stageCounts = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: stats.byStatus[s.key] ?? 0,
  }));

  const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);

  return (
    <div
      role="img"
      aria-label="Pipeline funnel showing application counts by stage"
      className="w-full"
    >
      <div className="flex items-end gap-1 h-12">
        {stageCounts.map((stage) => {
          const heightPct = (stage.count / maxCount) * 100;
          return (
            <div
              key={stage.key}
              className="flex flex-col items-center flex-1 gap-1"
            >
              <span
                aria-hidden="true"
                className="text-xs font-mono"
                style={{ color: stage.color, fontSize: "9px" }}
              >
                {stage.count}
              </span>
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${Math.max(heightPct * 0.36, stage.count > 0 ? 4 : 2)}px`,
                  backgroundColor: stage.color,
                  opacity: stage.count > 0 ? 0.85 : 0.2,
                  transition: "height 0.4s ease-out",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Stage labels */}
      <div className="flex gap-1 mt-1">
        {stageCounts.map((stage) => (
          <div key={stage.key} className="flex-1 text-center">
            <span
              style={{
                color: "#4A7A9B",
                fontSize: "7px",
                fontFamily: "IBM Plex Mono, monospace",
                letterSpacing: "0.05em",
              }}
            >
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversion rate display
// ---------------------------------------------------------------------------
function ConversionRate({
  label,
  value,
  benchmark,
}: {
  label: string;
  value: number;
  benchmark: number;
}): JSX.Element {
  const isAboveBenchmark = value >= benchmark;
  const color = isAboveBenchmark ? "#00FF87" : "#F59E0B";

  return (
    <div className="flex flex-col items-start" role="group" aria-label={`${label}: ${value.toFixed(1)}%`}>
      <span
        style={{
          fontSize: "9px",
          fontFamily: "IBM Plex Mono, monospace",
          color: "#4A7A9B",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        style={{
          fontSize: "22px",
          fontFamily: "IBM Plex Mono, monospace",
          color,
          lineHeight: 1,
          fontWeight: 700,
          transform: "rotate(-0.5deg)",
        }}
      >
        {value.toFixed(0)}
        <span style={{ fontSize: "12px", fontWeight: 400 }}>%</span>
      </span>
      <span
        style={{
          fontSize: "8px",
          fontFamily: "IBM Plex Mono, monospace",
          color: "#4A7A9B",
        }}
      >
        avg {benchmark}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stale ops counter
// ---------------------------------------------------------------------------
function StaleCounter({
  staleCount,
  warmCount,
}: {
  staleCount: number;
  warmCount: number;
}): JSX.Element {
  const hasStale = staleCount > 0;

  return (
    <div
      role="status"
      aria-label={`${staleCount} stale operations, ${warmCount} warming`}
      className="flex flex-col gap-1"
    >
      <div className="flex items-baseline gap-1">
        <span
          style={{
            fontSize: "28px",
            fontFamily: "IBM Plex Mono, monospace",
            fontWeight: 700,
            color: hasStale ? "#F59E0B" : "#4A7A9B",
            transform: "rotate(-1deg)",
            display: "inline-block",
            lineHeight: 1,
            transition: "color 0.3s ease",
          }}
          aria-hidden="true"
        >
          {staleCount}
        </span>
        <span
          style={{
            fontSize: "9px",
            fontFamily: "IBM Plex Mono, monospace",
            color: hasStale ? "#F59E0B" : "#4A7A9B",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          STALE OPS
        </span>
      </div>
      {warmCount > 0 && (
        <span
          style={{
            fontSize: "9px",
            fontFamily: "IBM Plex Mono, monospace",
            color: "#7FB3D3",
          }}
          aria-hidden="true"
        >
          +{warmCount} warming
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main whiteboard component
// ---------------------------------------------------------------------------
export function CROWhiteboard({ stats }: CROWhiteboardProps): JSX.Element {
  return (
    <div
      role="region"
      aria-label="CRO pipeline whiteboard"
      className="relative rounded-md p-4 w-full"
      style={{
        backgroundColor: "#0A1628",
        border: "1px solid #1E3A5F",
        boxShadow: "inset 0 0 24px rgba(30, 144, 255, 0.04)",
        fontFamily: "IBM Plex Mono, monospace",
      }}
    >
      {/* Board header */}
      <div className="flex items-center justify-between mb-3">
        <span
          style={{
            fontSize: "10px",
            color: "#7FB3D3",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            transform: "rotate(-0.3deg)",
            display: "inline-block",
          }}
        >
          PIPELINE // LIVE
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "#1E90FF",
            fontWeight: 700,
          }}
          aria-label={`Total active: ${stats.total}`}
        >
          {stats.total} OPS
        </span>
      </div>

      {/* Funnel bar */}
      <div className="mb-4">
        <PipelineFunnelBar stats={stats} />
      </div>

      {/* Conversion rates row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <ConversionRate
          label="APP→SCR"
          value={stats.appliedToScreeningRate}
          benchmark={20}
        />
        <ConversionRate
          label="SCR→INT"
          value={stats.screeningToInterviewRate}
          benchmark={25}
        />
        <ConversionRate
          label="INT→OFR"
          value={stats.interviewToOfferRate}
          benchmark={15}
        />
      </div>

      {/* Stale ops counter */}
      <div
        className="border-t pt-3"
        style={{ borderColor: "#1E3A5F" }}
      >
        <StaleCounter
          staleCount={stats.staleCount}
          warmCount={stats.warmCount}
        />
      </div>

      {/* Decorative chalk dust line */}
      <div
        aria-hidden="true"
        className="absolute bottom-2 right-3"
        style={{
          fontSize: "8px",
          color: "#1E3A5F",
          fontFamily: "IBM Plex Mono, monospace",
          transform: "rotate(1.2deg)",
        }}
      >
        // CRO METRICS
      </div>
    </div>
  );
}
