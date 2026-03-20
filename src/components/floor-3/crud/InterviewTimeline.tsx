"use client";

import type { JSX } from "react";
import { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type InterviewFormat = "in-person" | "video" | "phone" | "panel" | "case";

export interface Interview {
  id: string;
  company: string;
  role: string;
  scheduledAt: string;
  round: string;
  format: InterviewFormat;
  location?: string;
  prepPacketId?: string;
  prepCompleteness: number; // 0–100
  status: "upcoming" | "completed" | "cancelled" | "rescheduled";
  notes?: string;
}

interface InterviewTimelineProps {
  interviews: Interview[];
  selectedInterviewId?: string;
  onSelectInterview: (interview: Interview) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getCountdown(scheduledAt: string): {
  label: string;
  color: string;
  isPast: boolean;
} {
  const now = new Date();
  const target = new Date(scheduledAt);
  const diffMs = target.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);

  if (diffMs < 0) {
    const pastD = Math.abs(diffD);
    return {
      label: pastD === 0 ? "TODAY" : `${pastD}D AGO`,
      color: "#4A6A85",
      isPast: true,
    };
  }
  if (diffH < 2) return { label: `${diffH}H`, color: "#DC3C3C", isPast: false };
  if (diffH < 24) return { label: `${diffH}H`, color: "#F59E0B", isPast: false };
  if (diffD < 3) return { label: `${diffD}D`, color: "#F59E0B", isPast: false };
  return { label: `${diffD}D`, color: "#4A9EDB", isPast: false };
}

function formatDate(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const FORMAT_LABELS: Record<InterviewFormat, string> = {
  "in-person": "IN-PERSON",
  video: "VIDEO",
  phone: "PHONE",
  panel: "PANEL",
  case: "CASE",
};

const FORMAT_COLORS: Record<InterviewFormat, string> = {
  "in-person": "#4A9EDB",
  video: "#7EC8E3",
  phone: "#8BAECB",
  panel: "#F59E0B",
  case: "#00CC88",
};

function getPrepColor(completeness: number): string {
  if (completeness >= 80) return "#00CC88";
  if (completeness >= 40) return "#F59E0B";
  return "#DC3C3C";
}

function getStatusDot(status: Interview["status"]): {
  color: string;
  label: string;
} {
  switch (status) {
    case "upcoming":
      return { color: "#4A9EDB", label: "Upcoming" };
    case "completed":
      return { color: "#00CC88", label: "Completed" };
    case "cancelled":
      return { color: "#DC3C3C", label: "Cancelled" };
    case "rescheduled":
      return { color: "#F59E0B", label: "Rescheduled" };
  }
}

// ---------------------------------------------------------------------------
// Single interview card in timeline
// ---------------------------------------------------------------------------
function InterviewCard({
  interview,
  isSelected,
  onSelect,
}: {
  interview: Interview;
  isSelected: boolean;
  onSelect: (interview: Interview) => void;
}): JSX.Element {
  const countdown = getCountdown(interview.scheduledAt);
  const statusDot = getStatusDot(interview.status);
  const prepColor = getPrepColor(interview.prepCompleteness);
  const hasPacket = !!interview.prepPacketId;

  return (
    <button
      type="button"
      onClick={() => onSelect(interview)}
      aria-label={`${interview.company} ${interview.round} — ${formatDate(interview.scheduledAt)}, prep ${interview.prepCompleteness}% complete${hasPacket ? ", packet available" : ""}`}
      aria-pressed={isSelected}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: isSelected
          ? "rgba(74, 158, 219, 0.1)"
          : "rgba(13, 21, 36, 0.6)",
        border: isSelected
          ? "1px solid rgba(74, 158, 219, 0.45)"
          : "1px solid rgba(26, 46, 74, 0.8)",
        borderRadius: "2px",
        padding: "10px 12px",
        cursor: "pointer",
        transition: "background 0.15s ease, border-color 0.15s ease",
        outline: "none",
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(74, 158, 219, 0.06)";
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "rgba(74, 158, 219, 0.25)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(13, 21, 36, 0.6)";
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "rgba(26, 46, 74, 0.8)";
        }
      }}
      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A9EDB]"
    >
      {/* Top row: company + countdown */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            color: countdown.isPast ? "#8BAECB" : "#E8F4FD",
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {interview.company}
        </span>
        <span
          style={{
            fontSize: "13px",
            color: countdown.color,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {countdown.label}
        </span>
      </div>

      {/* Second row: role */}
      <div
        style={{
          fontSize: "11px",
          color: "#8BAECB",
          marginBottom: "5px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {interview.role}
      </div>

      {/* Third row: date/time + format badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "6px",
        }}
      >
        <span style={{ fontSize: "10px", color: "#4A6A85" }}>
          {formatDate(interview.scheduledAt)} · {formatTime(interview.scheduledAt)}
        </span>
        <span
          style={{
            fontSize: "8px",
            color: FORMAT_COLORS[interview.format],
            backgroundColor: `${FORMAT_COLORS[interview.format]}18`,
            border: `1px solid ${FORMAT_COLORS[interview.format]}40`,
            borderRadius: "2px",
            padding: "1px 5px",
            letterSpacing: "0.06em",
          }}
        >
          {FORMAT_LABELS[interview.format]}
        </span>
        <span style={{ fontSize: "9px", color: "#4A6A85" }}>
          {interview.round}
        </span>
      </div>

      {/* Bottom row: prep status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {/* Status dot */}
        <span
          aria-hidden="true"
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            backgroundColor: statusDot.color,
            flexShrink: 0,
          }}
        />
        <span
          style={{ fontSize: "8px", color: "#4A6A85", textTransform: "uppercase" }}
        >
          {statusDot.label}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Prep packet indicator */}
        {hasPacket ? (
          <span
            style={{
              fontSize: "8px",
              color: "#00CC88",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            ✓ PACKET
          </span>
        ) : (
          <span
            style={{
              fontSize: "8px",
              color: "#4A6A85",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            NO PACKET
          </span>
        )}

        {/* Prep completeness */}
        <div
          role="meter"
          aria-valuenow={interview.prepCompleteness}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Prep ${interview.prepCompleteness}% complete`}
          style={{
            width: "40px",
            height: "3px",
            backgroundColor: "rgba(26, 46, 74, 0.8)",
            borderRadius: "1.5px",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              height: "100%",
              width: `${interview.prepCompleteness}%`,
              backgroundColor: prepColor,
              borderRadius: "1.5px",
            }}
          />
        </div>
        <span style={{ fontSize: "8px", color: prepColor, minWidth: "26px" }}>
          {interview.prepCompleteness}%
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Month/date group header
// ---------------------------------------------------------------------------
function TimelineGroupHeader({ label }: { label: string }): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        margin: "16px 0 8px",
      }}
    >
      <span
        style={{
          fontSize: "9px",
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
          color: "#4A6A85",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        aria-hidden="true"
        style={{
          flex: 1,
          height: "1px",
          background:
            "linear-gradient(to right, rgba(74, 158, 219, 0.2), transparent)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function InterviewTimeline({
  interviews,
  selectedInterviewId,
  onSelectInterview,
}: InterviewTimelineProps): JSX.Element {
  const [showPast, setShowPast] = useState(false);

  const now = new Date();

  const upcomingInterviews = interviews
    .filter(
      (i) =>
        i.status !== "cancelled" && new Date(i.scheduledAt) >= now
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

  const pastInterviews = interviews
    .filter((i) => new Date(i.scheduledAt) < now)
    .sort(
      (a, b) =>
        new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );

  const handleTogglePast = useCallback(() => {
    setShowPast((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (interview: Interview) => {
      onSelectInterview(interview);
    },
    [onSelectInterview]
  );

  if (interviews.length === 0) {
    return (
      <div
        role="status"
        aria-label="No interviews scheduled"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: "8px",
          opacity: 0.5,
          padding: "24px",
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            fontSize: "10px",
            color: "#4A6A85",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          NO INTERVIEWS SCHEDULED
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            fontSize: "9px",
            color: "#2D4A62",
          }}
        >
          Add interviews from the pipeline
        </span>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Interview timeline"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px 6px",
          borderBottom: "1px solid rgba(26, 46, 74, 0.6)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            color: "#4A6A85",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
          }}
        >
          INTERVIEW TIMELINE
        </span>
        <span
          style={{ fontSize: "9px", color: "#4A9EDB", fontWeight: 700 }}
        >
          {upcomingInterviews.length} UPCOMING
        </span>
      </div>

      {/* Scrollable list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 10px 12px",
          scrollbarWidth: "thin",
          scrollbarColor: "#1A2E4A #060A12",
        }}
      >
        {/* Upcoming section */}
        {upcomingInterviews.length > 0 && (
          <section aria-label="Upcoming interviews">
            <TimelineGroupHeader label="UPCOMING" />
            <div
              style={{
                position: "relative",
                paddingLeft: "14px",
              }}
            >
              {/* Vertical connecting line */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "5px",
                  top: "8px",
                  bottom: "8px",
                  width: "1px",
                  background:
                    "linear-gradient(to bottom, rgba(74, 158, 219, 0.4), rgba(74, 158, 219, 0.1))",
                }}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {upcomingInterviews.map((interview, idx) => (
                  <div key={interview.id} style={{ position: "relative" }}>
                    {/* Timeline node dot */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: "-11px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        backgroundColor:
                          idx === 0 ? "#00E5FF" : "rgba(74, 158, 219, 0.5)",
                        boxShadow:
                          idx === 0
                            ? "0 0 6px rgba(0, 229, 255, 0.7)"
                            : "none",
                        border: "1px solid rgba(74, 158, 219, 0.4)",
                        zIndex: 1,
                      }}
                    />
                    <InterviewCard
                      interview={interview}
                      isSelected={interview.id === selectedInterviewId}
                      onSelect={handleSelect}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Past interviews toggle */}
        {pastInterviews.length > 0 && (
          <section aria-label="Past interviews">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "16px 0 8px" }}>
              <button
                type="button"
                onClick={handleTogglePast}
                aria-expanded={showPast}
                aria-controls="past-interviews-list"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  outline: "none",
                }}
                className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A9EDB]"
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                    color: "#4A6A85",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  }}
                >
                  PAST ({pastInterviews.length})
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: "8px",
                    color: "#4A6A85",
                    transform: showPast ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    display: "inline-block",
                  }}
                >
                  ▶
                </span>
              </button>
              <div
                aria-hidden="true"
                style={{
                  flex: 1,
                  height: "1px",
                  background:
                    "linear-gradient(to right, rgba(26, 46, 74, 0.6), transparent)",
                }}
              />
            </div>

            {showPast && (
              <div
                id="past-interviews-list"
                style={{
                  paddingLeft: "14px",
                  position: "relative",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "5px",
                    top: "8px",
                    bottom: "8px",
                    width: "1px",
                    background:
                      "linear-gradient(to bottom, rgba(26, 46, 74, 0.5), transparent)",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {pastInterviews.map((interview) => (
                    <div key={interview.id} style={{ position: "relative", opacity: 0.65 }}>
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          left: "-11px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(26, 46, 74, 0.9)",
                          border: "1px solid rgba(74, 158, 219, 0.2)",
                          zIndex: 1,
                        }}
                      />
                      <InterviewCard
                        interview={interview}
                        isSelected={interview.id === selectedInterviewId}
                        onSelect={handleSelect}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
