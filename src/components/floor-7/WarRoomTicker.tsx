"use client";

import type { JSX } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface WarRoomStats {
  total: number;
  screening: number;
  interviewing: number;
  offers: number;
  stale: number;
}

interface WarRoomTickerProps {
  stats: WarRoomStats;
}

function getPipelineHealth(stats: WarRoomStats): number {
  if (stats.total === 0) return 0;
  // Weighted health score: interviews + offers heavily weighted
  const activeWeight =
    stats.screening * 15 +
    stats.interviewing * 25 +
    stats.offers * 40;
  const stalepenalty = Math.min(stats.stale * 8, 30);
  const base = Math.min(
    100,
    Math.round((activeWeight / Math.max(stats.total, 1)) * 2.5)
  );
  return Math.max(0, Math.min(100, base - stalepenalty + (stats.total > 0 ? 10 : 0)));
}

/** Single segment in the ticker strip */
function TickerSegment({ stats }: { stats: WarRoomStats }): JSX.Element {
  const health = getPipelineHealth(stats);

  const healthColor =
    health >= 70
      ? "#00FF87"
      : health >= 40
      ? "#F59E0B"
      : "#DC3C3C";

  return (
    <span className="inline-flex items-center gap-0" aria-hidden="true">
      {/* Active ops */}
      <span style={{ color: "#7FB3D3" }}>ACTIVE OPS:&nbsp;</span>
      <span style={{ color: "#E8F4FD" }}>{stats.total}</span>
      <span style={{ color: "#1E3A5F", margin: "0 20px" }}>|</span>

      {/* Screening */}
      <span style={{ color: "#7FB3D3" }}>SCREENING:&nbsp;</span>
      <span style={{ color: "#00D4FF" }}>{stats.screening}</span>
      <span style={{ color: "#1E3A5F", margin: "0 20px" }}>|</span>

      {/* Interviews */}
      <span style={{ color: "#7FB3D3" }}>INTERVIEWS:&nbsp;</span>
      <span style={{ color: "#F59E0B" }}>{stats.interviewing}</span>
      <span style={{ color: "#1E3A5F", margin: "0 20px" }}>|</span>

      {/* Stale */}
      {stats.stale > 0 ? (
        <>
          <span style={{ color: "#7FB3D3" }}>STALE:&nbsp;</span>
          <span style={{ color: "#DC3C3C" }}>
            {stats.stale}&nbsp;⚠
          </span>
          <span style={{ color: "#1E3A5F", margin: "0 20px" }}>|</span>
        </>
      ) : null}

      {/* Pipeline health */}
      <span style={{ color: "#7FB3D3" }}>PIPELINE HEALTH:&nbsp;</span>
      <span style={{ color: healthColor, fontWeight: 600 }}>
        {health}/100
      </span>

      {/* Spacer before repeat */}
      <span style={{ display: "inline-block", width: "64px" }} />
    </span>
  );
}

/**
 * WarRoomTicker — bottom scrolling status strip showing live pipeline data.
 * Duplicates content for seamless infinite scroll.
 */
export function WarRoomTicker({ stats }: WarRoomTickerProps): JSX.Element {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="war-room-ticker"
      role="status"
      aria-label="Pipeline status ticker"
      style={{
        height: "32px",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Fade-in edge gradients */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "64px",
          background:
            "linear-gradient(to right, rgba(6, 11, 20, 0.95), transparent)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "64px",
          background:
            "linear-gradient(to left, rgba(6, 11, 20, 0.95), transparent)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {reducedMotion ? (
        /* Static summary when reduced motion is preferred */
        <span
          className="px-4"
          style={{
            fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "#7FB3D3",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          ACTIVE OPS: {stats.total} | SCREENING: {stats.screening} |
          INTERVIEWS: {stats.interviewing}
          {stats.stale > 0 ? ` | STALE: ${stats.stale} ⚠` : ""} | PIPELINE
          HEALTH: {getPipelineHealth(stats)}/100
        </span>
      ) : (
        <div
          className="war-room-ticker-track"
          style={{
            fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            paddingLeft: "100vw",
          }}
        >
          {/* Duplicate for seamless infinite loop */}
          <TickerSegment stats={stats} />
          <TickerSegment stats={stats} />
        </div>
      )}
    </div>
  );
}
