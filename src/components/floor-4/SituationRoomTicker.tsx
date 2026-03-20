"use client";

import type { JSX } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface SituationRoomStats {
  overdueFollowUps: number;
  todayInterviews: number;
  pendingOutreach: number;
  unreadEmails: number;
}

interface SituationRoomTickerProps {
  stats: SituationRoomStats;
}

function getUrgencyScore(stats: SituationRoomStats): number {
  // Higher = more urgent. Overdue items heavily weighted.
  const base =
    stats.overdueFollowUps * 35 +
    stats.todayInterviews * 20 +
    stats.pendingOutreach * 10 +
    Math.min(stats.unreadEmails * 3, 20);
  return Math.min(100, base);
}

/** Single segment in the ticker strip */
function TickerSegment({ stats }: { stats: SituationRoomStats }): JSX.Element {
  const urgency = getUrgencyScore(stats);
  const hasOverdue = stats.overdueFollowUps > 0;

  const urgencyColor =
    urgency >= 70
      ? "#E84040"
      : urgency >= 35
      ? "#DC7C28"
      : "#C4925A";

  return (
    <span className="inline-flex items-center gap-0" aria-hidden="true">
      {/* Overdue follow-ups — red if any */}
      <span style={{ color: "#C4925A" }}>OVERDUE:&nbsp;</span>
      <span
        style={{
          color: hasOverdue ? "#E84040" : "#FDF3E8",
          fontWeight: hasOverdue ? 700 : 400,
        }}
      >
        {stats.overdueFollowUps}
        {hasOverdue ? " ⚠" : ""}
      </span>
      <span style={{ color: "#3D2E0A", margin: "0 20px" }}>|</span>

      {/* Today's interviews */}
      <span style={{ color: "#C4925A" }}>INTERVIEWS TODAY:&nbsp;</span>
      <span style={{ color: "#F0A050" }}>{stats.todayInterviews}</span>
      <span style={{ color: "#3D2E0A", margin: "0 20px" }}>|</span>

      {/* Pending outreach */}
      <span style={{ color: "#C4925A" }}>PENDING OUTREACH:&nbsp;</span>
      <span style={{ color: "#DC7C28" }}>{stats.pendingOutreach}</span>
      <span style={{ color: "#3D2E0A", margin: "0 20px" }}>|</span>

      {/* Unread emails */}
      <span style={{ color: "#C4925A" }}>UNREAD EMAILS:&nbsp;</span>
      <span style={{ color: "#F0A050" }}>{stats.unreadEmails}</span>
      <span style={{ color: "#3D2E0A", margin: "0 20px" }}>|</span>

      {/* Urgency score */}
      <span style={{ color: "#C4925A" }}>URGENCY SCORE:&nbsp;</span>
      <span style={{ color: urgencyColor, fontWeight: 600 }}>
        {urgency}/100
      </span>

      {/* Spacer before repeat */}
      <span style={{ display: "inline-block", width: "64px" }} />
    </span>
  );
}

/**
 * SituationRoomTicker — bottom scrolling status strip showing live
 * follow-up / calendar / urgency data for Floor 4.
 * Duplicates content for seamless infinite scroll.
 */
export function SituationRoomTicker({
  stats,
}: SituationRoomTickerProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const urgency = getUrgencyScore(stats);

  return (
    <div
      className="situation-room-ticker"
      role="status"
      aria-label="Situation room urgency ticker"
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
            "linear-gradient(to right, rgba(10, 8, 0, 0.95), transparent)",
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
            "linear-gradient(to left, rgba(10, 8, 0, 0.95), transparent)",
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
          OVERDUE: {stats.overdueFollowUps}
          {stats.overdueFollowUps > 0 ? " ⚠" : ""} | INTERVIEWS TODAY:{" "}
          {stats.todayInterviews} | PENDING OUTREACH: {stats.pendingOutreach} |
          URGENCY: {urgency}/100
        </span>
      ) : (
        <div
          className="situation-room-ticker-track"
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
