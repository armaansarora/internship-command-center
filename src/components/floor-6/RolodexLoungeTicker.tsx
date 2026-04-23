"use client";

import type { JSX } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface RolodexLoungeStats {
  totalContacts: number;
  warmCount: number;
  coolingCount: number;
  coldCount: number;
  companiesCount: number;
  recentActivity: string;
}

interface RolodexLoungeTickerProps {
  stats: RolodexLoungeStats;
}

function getNetworkHealth(stats: RolodexLoungeStats): number {
  if (stats.totalContacts === 0) return 0;
  const warmWeight = stats.warmCount * 30;
  const coolingWeight = stats.coolingCount * 10;
  const coldPenalty = Math.min(stats.coldCount * 8, 30);
  const base = Math.min(
    100,
    Math.round(((warmWeight + coolingWeight) / Math.max(stats.totalContacts, 1)) * 2)
  );
  return Math.max(0, Math.min(100, base - coldPenalty + (stats.totalContacts > 0 ? 10 : 0)));
}

/** Single segment in the lounge ticker strip */
function TickerSegment({ stats }: { stats: RolodexLoungeStats }): JSX.Element {
  const health = getNetworkHealth(stats);

  // R8 cool-blue palette for warmth counts. Network health uses gold for
  // the top tier but steps down through slate rather than red.
  const healthColor =
    health >= 70
      ? "#C9A84C"
      : health >= 40
      ? "#A68E5E"
      : "#8892A0";

  return (
    <span className="inline-flex items-center gap-0" aria-hidden="true">
      {/* Total contacts */}
      <span style={{ color: "#C4925A" }}>NETWORK:&nbsp;</span>
      <span style={{ color: "#FDF3E8" }}>{stats.totalContacts}</span>
      <span style={{ color: "#5C3A1E", margin: "0 20px" }}>|</span>

      {/* Warm — gold */}
      <span style={{ color: "#C4925A" }}>WARM:&nbsp;</span>
      <span style={{ color: "#C9A84C" }}>{stats.warmCount}</span>
      <span style={{ color: "#5C3A1E", margin: "0 20px" }}>|</span>

      {/* Cooling — pale slate */}
      <span style={{ color: "#C4925A" }}>COOLING:&nbsp;</span>
      <span style={{ color: "#8892A0" }}>{stats.coolingCount}</span>
      <span style={{ color: "#5C3A1E", margin: "0 20px" }}>|</span>

      {/* Cold — muted blue-grey. No warning glyph. Descriptive only. */}
      {stats.coldCount > 0 ? (
        <>
          <span style={{ color: "#C4925A" }}>COLD:&nbsp;</span>
          <span style={{ color: "#6E7E8F" }}>
            {stats.coldCount}
          </span>
          <span style={{ color: "#5C3A1E", margin: "0 20px" }}>|</span>
        </>
      ) : null}

      {/* Companies */}
      <span style={{ color: "#C4925A" }}>COMPANIES:&nbsp;</span>
      <span style={{ color: "#C9A84C" }}>{stats.companiesCount}</span>
      <span style={{ color: "#5C3A1E", margin: "0 20px" }}>|</span>

      {/* Recent activity */}
      {stats.recentActivity && (
        <>
          <span style={{ color: "#C4925A" }}>LATEST:&nbsp;</span>
          <span style={{ color: "#E8C87A" }}>{stats.recentActivity}</span>
          <span style={{ color: "#5C3A1E", margin: "0 20px" }}>|</span>
        </>
      )}

      {/* Network health */}
      <span style={{ color: "#C4925A" }}>NETWORK HEALTH:&nbsp;</span>
      <span style={{ color: healthColor, fontWeight: 600 }}>
        {health}/100
      </span>

      {/* Spacer before repeat */}
      <span style={{ display: "inline-block", width: "64px" }} />
    </span>
  );
}

/**
 * RolodexLoungeTicker — bottom scrolling status strip showing live networking data.
 * Duplicates content for seamless infinite scroll.
 */
export function RolodexLoungeTicker({ stats }: RolodexLoungeTickerProps): JSX.Element {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="rolodex-ticker"
      role="status"
      aria-label="Network status ticker"
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
            "linear-gradient(to right, rgba(26, 15, 5, 0.95), transparent)",
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
            "linear-gradient(to left, rgba(26, 15, 5, 0.95), transparent)",
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
            color: "#C4925A",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          NETWORK: {stats.totalContacts} | WARM: {stats.warmCount} | COOLING:{" "}
          {stats.coolingCount}
          {stats.coldCount > 0 ? ` | COLD: ${stats.coldCount} ⚠` : ""} |
          COMPANIES: {stats.companiesCount} | HEALTH:{" "}
          {getNetworkHealth(stats)}/100
        </span>
      ) : (
        <div
          className="rolodex-ticker-track"
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
