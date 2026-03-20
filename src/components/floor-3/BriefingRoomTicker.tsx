"use client";

import type { JSX } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface BriefingRoomStats {
  interviewsThisWeek: number;
  prepCoverage: number;
  nextInterviewCompany: string | null;
  nextInterviewHours: number | null;
  cpoStatus: "standing-by" | "active" | "briefing";
}

interface BriefingRoomTickerProps {
  stats: BriefingRoomStats;
}

function getCPOStatusLabel(status: BriefingRoomStats["cpoStatus"]): string {
  switch (status) {
    case "active":
      return "CPO STATUS: ACTIVE";
    case "briefing":
      return "CPO STATUS: BRIEFING";
    default:
      return "CPO STATUS: STANDING BY";
  }
}

function getCPOStatusColor(status: BriefingRoomStats["cpoStatus"]): string {
  switch (status) {
    case "active":
      return "#00E5FF";
    case "briefing":
      return "#F59E0B";
    default:
      return "#4A9EDB";
  }
}

/** Single segment in the ticker strip */
function TickerSegment({ stats }: { stats: BriefingRoomStats }): JSX.Element {
  const prepColor =
    stats.prepCoverage >= 80
      ? "#00CC88"
      : stats.prepCoverage >= 50
      ? "#F59E0B"
      : "#DC3C3C";

  const cpoColor = getCPOStatusColor(stats.cpoStatus);
  const cpoLabel = getCPOStatusLabel(stats.cpoStatus);

  return (
    <span className="inline-flex items-center gap-0" aria-hidden="true">
      {/* Interviews this week */}
      <span style={{ color: "#8BAECB" }}>INTERVIEWS THIS WEEK:&nbsp;</span>
      <span style={{ color: "#E8F4FD", fontWeight: 600 }}>
        {stats.interviewsThisWeek}
      </span>
      <span style={{ color: "#1A2E4A", margin: "0 20px" }}>|</span>

      {/* Prep coverage */}
      <span style={{ color: "#8BAECB" }}>PREP COVERAGE:&nbsp;</span>
      <span style={{ color: prepColor, fontWeight: 600 }}>
        {stats.prepCoverage}%
      </span>
      <span style={{ color: "#1A2E4A", margin: "0 20px" }}>|</span>

      {/* Next interview */}
      {stats.nextInterviewCompany && stats.nextInterviewHours !== null ? (
        <>
          <span style={{ color: "#8BAECB" }}>NEXT:&nbsp;</span>
          <span style={{ color: "#7EC8E3" }}>{stats.nextInterviewCompany}</span>
          <span style={{ color: "#8BAECB" }}>&nbsp;—&nbsp;</span>
          <span style={{ color: "#F59E0B", fontWeight: 600 }}>
            {stats.nextInterviewHours}H
          </span>
          <span style={{ color: "#1A2E4A", margin: "0 20px" }}>|</span>
        </>
      ) : (
        <>
          <span style={{ color: "#8BAECB" }}>NEXT INTERVIEW:&nbsp;</span>
          <span style={{ color: "#4A6A85" }}>NONE SCHEDULED</span>
          <span style={{ color: "#1A2E4A", margin: "0 20px" }}>|</span>
        </>
      )}

      {/* CPO status */}
      <span style={{ color: cpoColor, fontWeight: 600 }}>{cpoLabel}</span>

      {/* Spacer before repeat */}
      <span style={{ display: "inline-block", width: "64px" }} />
    </span>
  );
}

/**
 * BriefingRoomTicker — bottom scrolling status strip showing live interview prep data.
 * Duplicates content for seamless infinite scroll.
 */
export function BriefingRoomTicker({
  stats,
}: BriefingRoomTickerProps): JSX.Element {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="briefing-room-ticker"
      role="status"
      aria-label="Interview prep status ticker"
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
            "linear-gradient(to right, rgba(6, 10, 18, 0.95), transparent)",
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
            "linear-gradient(to left, rgba(6, 10, 18, 0.95), transparent)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {reducedMotion ? (
        /* Static summary when reduced motion is preferred */
        <span
          className="px-4"
          style={{
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            fontSize: "11px",
            color: "#8BAECB",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {stats.interviewsThisWeek} INTERVIEWS THIS WEEK | PREP:{" "}
          {stats.prepCoverage}%
          {stats.nextInterviewCompany
            ? ` | NEXT: ${stats.nextInterviewCompany} — ${stats.nextInterviewHours}H`
            : ""}
          {" | "}
          {getCPOStatusLabel(stats.cpoStatus)}
        </span>
      ) : (
        <div
          className="briefing-room-ticker-track"
          style={{
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
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
