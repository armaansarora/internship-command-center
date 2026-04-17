"use client";

import type { JSX } from "react";
import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PrepStats {
  upcomingInterviews: UpcomingInterview[];
  prepCoverage: number;
  totalInterviews: number;
  interviewsWithPackets: number;
  questionCategories: QuestionCategoryBreakdown;
}

export interface UpcomingInterview {
  id: string;
  company: string;
  role: string;
  scheduledAt: string;
  hasPacket: boolean;
  round?: string;
}

export interface QuestionCategoryBreakdown {
  behavioral: number;
  technical: number;
  cultureFit: number;
  case: number;
}

// ---------------------------------------------------------------------------
// Countdown timer helper
// ---------------------------------------------------------------------------
function getCountdown(scheduledAt: string): {
  label: string;
  color: string;
  urgent: boolean;
} {
  const now = new Date();
  const target = new Date(scheduledAt);
  const diffMs = target.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);

  if (diffMs < 0) {
    return { label: "PAST", color: "#4A6A85", urgent: false };
  }
  if (diffH < 2) {
    return { label: `${diffH}H`, color: "#DC3C3C", urgent: true };
  }
  if (diffH < 24) {
    return { label: `${diffH}H`, color: "#F59E0B", urgent: true };
  }
  if (diffD < 3) {
    return { label: `${diffD}D`, color: "#F59E0B", urgent: false };
  }
  return { label: `${diffD}D`, color: "#4A9EDB", urgent: false };
}

// ---------------------------------------------------------------------------
// Upcoming interviews list
// ---------------------------------------------------------------------------
function UpcomingInterviewItem({
  interview,
}: {
  interview: UpcomingInterview;
}): JSX.Element {
  const countdown = getCountdown(interview.scheduledAt);

  return (
    <div
      role="listitem"
      aria-label={`${interview.company} interview in ${countdown.label}${interview.hasPacket ? ", prep packet ready" : ", no prep packet"}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        padding: "5px 0",
        borderBottom: "1px solid rgba(26, 46, 74, 0.6)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "12px",
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            color: "#E8F4FD",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {interview.company}
        </div>
        <div
          style={{
            fontSize: "9px",
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            color: "#4A6A85",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {interview.round ?? "INTERVIEW"} — {interview.role}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        {/* Prep packet indicator */}
        <span
          aria-hidden="true"
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: interview.hasPacket ? "#00CC88" : "#F59E0B",
            boxShadow: interview.hasPacket
              ? "0 0 4px rgba(0, 204, 136, 0.7)"
              : "0 0 4px rgba(245, 158, 11, 0.6)",
            flexShrink: 0,
          }}
        />
        {/* Countdown */}
        <span
          style={{
            fontSize: "13px",
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            color: countdown.color,
            fontWeight: 700,
            letterSpacing: "0.04em",
            minWidth: "28px",
            textAlign: "right",
          }}
        >
          {countdown.label}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prep coverage meter
// ---------------------------------------------------------------------------
function PrepCoverageBar({ coverage }: { coverage: number }): JSX.Element {
  const clampedCoverage = Math.max(0, Math.min(100, coverage));
  const color =
    clampedCoverage >= 80
      ? "#00CC88"
      : clampedCoverage >= 50
      ? "#F59E0B"
      : "#DC3C3C";

  return (
    <div role="meter" aria-valuenow={clampedCoverage} aria-valuemin={0} aria-valuemax={100}
      aria-label={`Prep coverage: ${clampedCoverage}%`}
    >
      <div
        style={{
          height: "4px",
          backgroundColor: "rgba(26, 46, 74, 0.8)",
          borderRadius: "2px",
          overflow: "hidden",
          marginTop: "3px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            height: "100%",
            width: `${clampedCoverage}%`,
            backgroundColor: color,
            borderRadius: "2px",
            transition: "width 0.6s ease-out",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question category breakdown
// ---------------------------------------------------------------------------
function QuestionBreakdown({
  categories,
}: {
  categories: QuestionCategoryBreakdown;
}): JSX.Element {
  const total =
    categories.behavioral +
    categories.technical +
    categories.cultureFit +
    categories.case;

  const items: Array<{ label: string; value: number; color: string }> = [
    { label: "BEHAV", value: categories.behavioral, color: "#4A9EDB" },
    { label: "TECH",  value: categories.technical,  color: "#7EC8E3" },
    { label: "CULT",  value: categories.cultureFit, color: "#00CC88" },
    { label: "CASE",  value: categories.case,       color: "#F59E0B" },
  ];

  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <div
      role="img"
      aria-label={`Question categories: ${total} total — behavioral: ${categories.behavioral}, technical: ${categories.technical}, culture fit: ${categories.cultureFit}, case: ${categories.case}`}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "28px" }}>
        {items.map((item) => {
          const heightPct = (item.value / maxVal) * 100;
          return (
            <div
              key={item.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2px",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: "8px",
                  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                  color: item.color,
                }}
              >
                {item.value}
              </span>
              <div
                aria-hidden="true"
                style={{
                  width: "100%",
                  height: `${Math.max(heightPct * 0.18, item.value > 0 ? 3 : 1)}px`,
                  backgroundColor: item.color,
                  opacity: item.value > 0 ? 0.8 : 0.2,
                  borderRadius: "1px",
                  transition: "height 0.4s ease-out",
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
        {items.map((item) => (
          <div key={item.label} style={{ flex: 1, textAlign: "center" }}>
            <span
              style={{
                fontSize: "6px",
                fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                color: "#4A6A85",
                letterSpacing: "0.04em",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main whiteboard component
// ---------------------------------------------------------------------------
interface CPOWhiteboardProps {
  stats: PrepStats;
}

export function CPOWhiteboard({ stats }: CPOWhiteboardProps): JSX.Element {
  const sortedInterviews = useMemo(
    () =>
      [...stats.upcomingInterviews]
        .filter((i) => new Date(i.scheduledAt) >= new Date())
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime()
        )
        .slice(0, 4),
    [stats.upcomingInterviews]
  );

  return (
    <div
      role="region"
      aria-label="CPO interview prep whiteboard"
      className="relative rounded-sm p-4 w-full br-whiteboard"
      style={{
        backgroundColor: "#090F1C",
        border: "1px solid #1A2E4A",
        boxShadow: "inset 0 0 24px rgba(74, 158, 219, 0.03)",
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
      }}
    >
      {/* Board header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            color: "#8BAECB",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            display: "inline-block",
          }}
        >
          PREP STATUS // LIVE
        </span>
        <span
          style={{ fontSize: "9px", color: "#4A9EDB", fontWeight: 700 }}
          aria-label={`${stats.totalInterviews} total interviews`}
        >
          {stats.totalInterviews} INTERVIEWS
        </span>
      </div>

      {/* Prep coverage */}
      <div style={{ marginBottom: "10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "8px",
              color: "#4A6A85",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            PREP COVERAGE
          </span>
          <span
            style={{
              fontSize: "18px",
              color:
                stats.prepCoverage >= 80
                  ? "#00CC88"
                  : stats.prepCoverage >= 50
                  ? "#F59E0B"
                  : "#DC3C3C",
              fontWeight: 700,
              lineHeight: 1,
            }}
            aria-hidden="true"
          >
            {stats.prepCoverage}
            <span style={{ fontSize: "10px", fontWeight: 400 }}>%</span>
          </span>
        </div>
        <PrepCoverageBar coverage={stats.prepCoverage} />
      </div>

      {/* Upcoming interviews */}
      {sortedInterviews.length > 0 ? (
        <div
          role="list"
          aria-label="Upcoming interviews"
          style={{ marginBottom: "10px" }}
        >
          {sortedInterviews.map((interview) => (
            <UpcomingInterviewItem key={interview.id} interview={interview} />
          ))}
        </div>
      ) : (
        <div
          style={{
            fontSize: "10px",
            color: "#4A6A85",
            textAlign: "center",
            padding: "8px 0",
            marginBottom: "10px",
          }}
          role="status"
        >
          NO UPCOMING INTERVIEWS
        </div>
      )}

      {/* Question category breakdown */}
      <div
        style={{
          borderTop: "1px solid #1A2E4A",
          paddingTop: "8px",
        }}
      >
        <span
          style={{
            fontSize: "8px",
            color: "#4A6A85",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            display: "block",
            marginBottom: "4px",
          }}
        >
          QUESTION CATEGORIES
        </span>
        <QuestionBreakdown categories={stats.questionCategories} />
      </div>

      {/* Decorative label */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "4px",
          right: "6px",
          fontSize: "7px",
          color: "#1A2E4A",
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
          transform: "rotate(0.8deg)",
          letterSpacing: "0.08em",
        }}
      >
        {"// CPO BRIEF"}
      </div>
    </div>
  );
}
