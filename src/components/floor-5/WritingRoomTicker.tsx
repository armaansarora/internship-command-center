"use client";

import type { JSX } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface WritingRoomStats {
  totalDocuments: number;
  coverLetters: number;
  latestDocTitle: string | null;
  latestDocCompany: string | null;
  latestDocVersion: number;
  latestDocUpdatedAt: Date | null;
  applicationsWithoutLetters: number;
  cmoStatus: "ready" | "drafting" | "reviewing";
}

interface WritingRoomTickerProps {
  stats: WritingRoomStats;
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return "—";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "JUST NOW";
  if (diffMins < 60) return `${diffMins}m AGO`;
  if (diffHours < 24) return `${diffHours}h AGO`;
  return `${diffDays}d AGO`;
}

function getCMOStatusColor(status: WritingRoomStats["cmoStatus"]): string {
  switch (status) {
    case "drafting":  return "#F5C842";
    case "reviewing": return "#C9A84C";
    case "ready":     return "#7BC47B";
  }
}

/** Single segment in the Writing Room ticker strip */
function TickerSegment({ stats }: { stats: WritingRoomStats }): JSX.Element {
  const statusColor = getCMOStatusColor(stats.cmoStatus);
  const timeAgo = formatTimeAgo(stats.latestDocUpdatedAt);

  return (
    <span className="inline-flex items-center gap-0" aria-hidden="true">
      {/* Cover letter count */}
      <span style={{ color: "#8B6E42" }}>COVER LETTERS ON FILE:&nbsp;</span>
      <span style={{ color: "#F5E6C8" }}>{stats.coverLetters}</span>
      <span style={{ color: "#3A2510", margin: "0 20px" }}>|</span>

      {/* Latest doc */}
      {stats.latestDocCompany && (
        <>
          <span style={{ color: "#8B6E42" }}>LATEST:&nbsp;</span>
          <span style={{ color: "#C9A84C" }}>
            {stats.latestDocCompany.toUpperCase()}
            {stats.latestDocVersion > 1 ? ` — V${stats.latestDocVersion}` : ""}
            {" — "}
            {timeAgo}
          </span>
          <span style={{ color: "#3A2510", margin: "0 20px" }}>|</span>
        </>
      )}

      {/* Applications needing letters */}
      {stats.applicationsWithoutLetters > 0 && (
        <>
          <span style={{ color: "#8B6E42" }}>NEEDS LETTER:&nbsp;</span>
          <span style={{ color: "#E8A020" }}>
            {stats.applicationsWithoutLetters}&nbsp;⚠
          </span>
          <span style={{ color: "#3A2510", margin: "0 20px" }}>|</span>
        </>
      )}

      {/* Total documents */}
      <span style={{ color: "#8B6E42" }}>TOTAL DOCS:&nbsp;</span>
      <span style={{ color: "#C8A878" }}>{stats.totalDocuments}</span>
      <span style={{ color: "#3A2510", margin: "0 20px" }}>|</span>

      {/* CMO status */}
      <span style={{ color: "#8B6E42" }}>CMO STATUS:&nbsp;</span>
      <span style={{ color: statusColor, fontWeight: 600 }}>
        {stats.cmoStatus.toUpperCase()}
      </span>

      {/* Spacer before repeat */}
      <span style={{ display: "inline-block", width: "72px" }} />
    </span>
  );
}

/**
 * WritingRoomTicker — bottom scrolling status strip showing live document data.
 * Duplicates content for seamless infinite scroll.
 * Same animation pattern as WarRoomTicker.
 */
export function WritingRoomTicker({ stats }: WritingRoomTickerProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const timeAgo = formatTimeAgo(stats.latestDocUpdatedAt);

  return (
    <div
      className="writing-room-ticker"
      role="status"
      aria-label="Writing room document status ticker"
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
            "linear-gradient(to right, rgba(26, 16, 8, 0.95), transparent)",
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
            "linear-gradient(to left, rgba(26, 16, 8, 0.95), transparent)",
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
            color: "#8B6E42",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          COVER LETTERS: {stats.coverLetters}
          {stats.latestDocCompany
            ? ` | LATEST: ${stats.latestDocCompany.toUpperCase()} — ${timeAgo}`
            : ""}
          {stats.applicationsWithoutLetters > 0
            ? ` | NEEDS LETTER: ${stats.applicationsWithoutLetters} ⚠`
            : ""}{" "}
          | CMO: {stats.cmoStatus.toUpperCase()}
        </span>
      ) : (
        <div
          className="writing-room-ticker-track"
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
