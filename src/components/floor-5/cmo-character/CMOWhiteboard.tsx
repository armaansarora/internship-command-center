"use client";

import type { JSX } from "react";
import type { WritingRoomStats } from "@/components/floor-5/WritingRoomTicker";

interface CMOWhiteboardProps {
  stats: WritingRoomStats;
  /** The title of the currently active document, if any */
  activeDocTitle?: string | null;
  /** Version history for the active document */
  versionHistory?: Array<{ version: number; updatedAt: Date }>;
}

// ---------------------------------------------------------------------------
// Document count meter — horizontal bars
// ---------------------------------------------------------------------------
function DocumentMeter({
  total,
  coverLetters,
  applicationsNeedingLetters,
}: {
  total: number;
  coverLetters: number;
  applicationsNeedingLetters: number;
}): JSX.Element {
  const coverPct = total > 0 ? (coverLetters / Math.max(total, 1)) * 100 : 0;
  const needsPct = total > 0 ? (applicationsNeedingLetters / Math.max(total, 1)) * 100 : 0;

  return (
    <div
      role="img"
      aria-label={`${coverLetters} cover letters out of ${total} total documents, ${applicationsNeedingLetters} applications still need letters`}
      className="w-full"
    >
      {/* Bar label row */}
      <div className="flex justify-between mb-1">
        <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#7A5C3A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Cover Letters
        </span>
        <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#C9A84C" }}>
          {coverLetters}
        </span>
      </div>
      {/* Cover letter bar */}
      <div
        style={{
          width: "100%",
          height: "4px",
          backgroundColor: "rgba(201,168,76,0.12)",
          borderRadius: "2px",
          marginBottom: "6px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(coverPct, 100)}%`,
            height: "100%",
            backgroundColor: "#C9A84C",
            borderRadius: "2px",
            opacity: 0.85,
            transition: "width 0.4s ease-out",
          }}
        />
      </div>

      {/* Needs letter bar */}
      {applicationsNeedingLetters > 0 && (
        <>
          <div className="flex justify-between mb-1">
            <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#7A5C3A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Needs Letter
            </span>
            <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#E8A020" }}>
              {applicationsNeedingLetters} ⚠
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "4px",
              backgroundColor: "rgba(232,160,32,0.12)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(needsPct, 100)}%`,
                height: "100%",
                backgroundColor: "#E8A020",
                borderRadius: "2px",
                opacity: 0.75,
                transition: "width 0.4s ease-out",
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Version history mini timeline
// ---------------------------------------------------------------------------
function VersionTimeline({
  versions,
}: {
  versions: Array<{ version: number; updatedAt: Date }>;
}): JSX.Element {
  const sorted = [...versions].sort((a, b) => a.version - b.version).slice(-4);

  function timeAgo(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return "< 1h";
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  }

  return (
    <div
      role="list"
      aria-label="Version history"
      className="flex items-end gap-2"
    >
      {sorted.map((v, i) => {
        const isLatest = i === sorted.length - 1;
        return (
          <div
            key={v.version}
            role="listitem"
            aria-label={`Version ${v.version}, ${timeAgo(v.updatedAt)} ago`}
            className="flex flex-col items-center gap-0.5"
            style={{ flex: 1 }}
          >
            <span
              style={{
                fontSize: "8px",
                fontFamily: "'JetBrains Mono', monospace",
                color: isLatest ? "#C9A84C" : "#5A3E20",
              }}
            >
              {timeAgo(v.updatedAt)}
            </span>
            <div
              style={{
                width: "100%",
                height: isLatest ? "16px" : `${8 + i * 2}px`,
                backgroundColor: isLatest ? "#C9A84C" : "#3A2510",
                borderRadius: "2px",
                opacity: isLatest ? 0.9 : 0.5 + i * 0.1,
                transition: "height 0.3s ease-out",
              }}
            />
            <span
              style={{
                fontSize: "7px",
                fontFamily: "'JetBrains Mono', monospace",
                color: "#5A3E20",
              }}
            >
              v{v.version}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CMO status readout
// ---------------------------------------------------------------------------
function CMOStatusBadge({
  status,
}: {
  status: WritingRoomStats["cmoStatus"];
}): JSX.Element {
  const config = {
    ready: { color: "#7BC47B", label: "READY", glow: "rgba(123,196,123,0.3)" },
    drafting: { color: "#F5C842", label: "DRAFTING", glow: "rgba(245,200,66,0.3)" },
    reviewing: { color: "#C9A84C", label: "REVIEWING", glow: "rgba(201,168,76,0.3)" },
  }[status];

  return (
    <div
      role="status"
      aria-label={`CMO status: ${config.label}`}
      className="flex items-center gap-2"
    >
      <span
        aria-hidden="true"
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: config.color,
          boxShadow: `0 0 5px ${config.glow}`,
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      <span
        style={{
          fontSize: "9px",
          fontFamily: "'JetBrains Mono', monospace",
          color: config.color,
          letterSpacing: "0.08em",
        }}
      >
        {config.label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main whiteboard component
// ---------------------------------------------------------------------------
export function CMOWhiteboard({
  stats,
  activeDocTitle,
  versionHistory,
}: CMOWhiteboardProps): JSX.Element {
  return (
    <div
      role="region"
      aria-label="CMO writing room dashboard"
      className="relative rounded-md p-4 w-full"
      style={{
        backgroundColor: "#211510",
        border: "1px solid #3A2510",
        boxShadow: "inset 0 0 20px rgba(201, 168, 76, 0.03)",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* Board header */}
      <div className="flex items-center justify-between mb-3">
        <span
          style={{
            fontSize: "10px",
            color: "#7A5C3A",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            display: "inline-block",
            transform: "rotate(-0.3deg)",
          }}
        >
          WRITING ROOM // LIVE
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "#C9A84C",
            fontWeight: 700,
          }}
          aria-label={`Total documents: ${stats.totalDocuments}`}
        >
          {stats.totalDocuments} DOCS
        </span>
      </div>

      {/* Document meter */}
      <div className="mb-4">
        <DocumentMeter
          total={stats.totalDocuments}
          coverLetters={stats.coverLetters}
          applicationsNeedingLetters={stats.applicationsWithoutLetters}
        />
      </div>

      {/* Active draft info */}
      {activeDocTitle && (
        <div
          className="mb-3 pb-3"
          style={{ borderBottom: "1px solid #2A1C12" }}
        >
          <p
            style={{
              fontSize: "9px",
              color: "#5A3E20",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "2px",
            }}
          >
            ACTIVE DRAFT
          </p>
          <p
            style={{
              fontSize: "12px",
              color: "#F5E6C8",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
            title={activeDocTitle}
          >
            {activeDocTitle}
          </p>
        </div>
      )}

      {/* Version history */}
      {versionHistory && versionHistory.length > 1 && (
        <div
          className="mb-3 pb-3"
          style={{ borderBottom: "1px solid #2A1C12" }}
        >
          <p
            style={{
              fontSize: "9px",
              color: "#5A3E20",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            REVISION HISTORY
          </p>
          <VersionTimeline versions={versionHistory} />
        </div>
      )}

      {/* CMO status */}
      <div
        className="border-t pt-3"
        style={{ borderColor: "#2A1C12" }}
      >
        <CMOStatusBadge status={stats.cmoStatus} />
        {stats.latestDocCompany && (
          <p
            style={{
              fontSize: "9px",
              color: "#5A3E20",
              marginTop: "4px",
            }}
          >
            Last: {stats.latestDocCompany.toUpperCase()}
          </p>
        )}
      </div>

      {/* Decorative pen stroke */}
      <div
        aria-hidden="true"
        className="absolute bottom-2 right-3"
        style={{
          fontSize: "8px",
          color: "#2A1C12",
          fontFamily: "'JetBrains Mono', monospace",
          transform: "rotate(1.2deg)",
        }}
      >
        // CMO METRICS
      </div>
    </div>
  );
}
