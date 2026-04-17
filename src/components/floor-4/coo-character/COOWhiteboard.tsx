"use client";

import type { JSX } from "react";
import { useState, useEffect } from "react";
import type { BriefingData } from "@/lib/db/queries/communications-rest";

interface COOWhiteboardProps {
  briefingData: BriefingData;
}

// ---------------------------------------------------------------------------
// Digital clock display
// ---------------------------------------------------------------------------
function DigitalClock(): JSX.Element {
  const [hours, setHours] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");
  const [colonVisible, setColonVisible] = useState(true);

  useEffect(() => {
    function tick() {
      const now = new Date();
      setHours(now.getHours().toString().padStart(2, "0"));
      setMinutes(now.getMinutes().toString().padStart(2, "0"));
      setColonVisible((v) => !v);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!hours) {
    return (
      <span
        style={{
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: "22px",
          color: "#DC7C28",
          letterSpacing: "0.08em",
        }}
        aria-label="Loading current time"
      >
        --:--
      </span>
    );
  }

  return (
    <span
      aria-label={`Current time: ${hours}:${minutes}`}
      style={{
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: "22px",
        fontWeight: 700,
        color: "#DC7C28",
        letterSpacing: "0.08em",
        lineHeight: 1,
      }}
    >
      {hours}
      <span
        aria-hidden="true"
        style={{ opacity: colonVisible ? 1 : 0, transition: "opacity 0.1s" }}
      >
        :
      </span>
      {minutes}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Overdue counter — big urgent number
// ---------------------------------------------------------------------------
function OverdueCounter({ count }: { count: number }): JSX.Element {
  const hasOverdue = count > 0;

  return (
    <div
      role="status"
      aria-label={`${count} overdue follow-up${count !== 1 ? "s" : ""}`}
      className="flex flex-col gap-0.5"
    >
      <div className="flex items-baseline gap-1.5">
        <span
          style={{
            fontSize: "32px",
            fontFamily: "IBM Plex Mono, monospace",
            fontWeight: 700,
            color: hasOverdue ? "#E84040" : "#7A5B35",
            transform: "rotate(-0.5deg)",
            display: "inline-block",
            lineHeight: 1,
            transition: "color 0.3s ease",
          }}
          aria-hidden="true"
        >
          {count}
        </span>
        <span
          style={{
            fontSize: "9px",
            fontFamily: "IBM Plex Mono, monospace",
            color: hasOverdue ? "#E84040" : "#7A5B35",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          OVERDUE{hasOverdue ? " ⚠" : ""}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Today's schedule timeline
// ---------------------------------------------------------------------------
interface ScheduleEvent {
  time: string;
  label: string;
  isNow: boolean;
  isPast: boolean;
}

function TodayTimeline({ events }: { events: ScheduleEvent[] }): JSX.Element {
  if (events.length === 0) {
    return (
      <div
        style={{
          fontSize: "11px",
          fontFamily: "IBM Plex Mono, monospace",
          color: "#7A5B35",
          fontStyle: "italic",
        }}
      >
        No events today
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Today's interview schedule"
      className="flex flex-col gap-1"
    >
      {events.map((evt, i) => (
        <div
          key={i}
          role="listitem"
          className="flex items-center gap-2"
          style={{ opacity: evt.isPast ? 0.45 : 1 }}
        >
          {/* Timeline dot */}
          <div
            aria-hidden="true"
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              flexShrink: 0,
              backgroundColor: evt.isNow
                ? "#FF6B35"
                : evt.isPast
                ? "#7A5B35"
                : "#DC7C28",
              boxShadow: evt.isNow
                ? "0 0 6px rgba(255, 107, 53, 0.8)"
                : "none",
            }}
          />
          {/* Time */}
          <span
            style={{
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: "9px",
              color: evt.isNow ? "#FF6B35" : "#7A5B35",
              width: "32px",
              flexShrink: 0,
            }}
          >
            {evt.time}
          </span>
          {/* Label */}
          <span
            style={{
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: "10px",
              color: evt.isNow ? "#FDF3E8" : "#C4925A",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {evt.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat badge row
// ---------------------------------------------------------------------------
function StatBadge({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: number;
  valueColor: string;
}): JSX.Element {
  return (
    <div
      className="flex items-center justify-between gap-2"
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <span
        style={{
          fontSize: "9px",
          fontFamily: "IBM Plex Mono, monospace",
          color: "#7A5B35",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "14px",
          fontFamily: "IBM Plex Mono, monospace",
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Derive schedule events from BriefingData.todaysInterviews
// ---------------------------------------------------------------------------
function deriveScheduleEvents(briefingData: BriefingData): ScheduleEvent[] {
  const now = new Date();
  const nowTotalMins = now.getHours() * 60 + now.getMinutes();

  return briefingData.todaysInterviews.slice(0, 4).map((interview) => {
    const start = new Date(interview.scheduledAt);
    const h = start.getHours();
    const m = start.getMinutes();
    const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    const totalMins = h * 60 + m;
    const duration = interview.durationMinutes ?? 60;
    const isPast = totalMins + duration < nowTotalMins;
    const isNow = totalMins <= nowTotalMins && nowTotalMins <= totalMins + duration;
    const companyLabel = interview.companyName ?? "Unknown";
    const roundLabel = interview.round ?? interview.format ?? "Interview";

    return {
      time: timeStr,
      label: `${companyLabel} — ${roundLabel}`,
      isNow,
      isPast,
    };
  });
}

// ---------------------------------------------------------------------------
// Main whiteboard component
// ---------------------------------------------------------------------------
export function COOWhiteboard({ briefingData }: COOWhiteboardProps): JSX.Element {
  const scheduleEvents = deriveScheduleEvents(briefingData);

  return (
    <div
      role="region"
      aria-label="COO operations whiteboard"
      className="relative rounded-md p-4 w-full"
      style={{
        backgroundColor: "#120C02",
        border: "1px solid #3D2E0A",
        boxShadow: "inset 0 0 24px rgba(220, 124, 40, 0.04)",
        fontFamily: "IBM Plex Mono, monospace",
      }}
    >
      {/* Board header with live clock */}
      <div className="flex items-center justify-between mb-3">
        <span
          style={{
            fontSize: "10px",
            color: "#C4925A",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            transform: "rotate(-0.3deg)",
            display: "inline-block",
          }}
        >
          OPS BOARD // LIVE
        </span>
        <DigitalClock />
      </div>

      {/* Overdue counter — most prominent metric */}
      <div className="mb-3">
        <OverdueCounter count={briefingData.overdueFollowUpsCount} />
      </div>

      {/* Secondary stats row */}
      <div
        className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 border-t pt-3"
        style={{ borderColor: "#3D2E0A" }}
      >
        <StatBadge
          label="INTERVIEWS"
          value={briefingData.todaysInterviews.length}
          valueColor="#F0A050"
        />
        <StatBadge
          label="UNREAD"
          value={briefingData.unreadEmailsCount}
          valueColor="#DC7C28"
        />
        <StatBadge
          label="OUTREACH"
          value={briefingData.pendingOutreachCount}
          valueColor={briefingData.pendingOutreachCount > 0 ? "#F59E0B" : "#7A5B35"}
        />
      </div>

      {/* Today's schedule timeline */}
      {scheduleEvents.length > 0 && (
        <div
          className="border-t pt-3"
          style={{ borderColor: "#3D2E0A" }}
        >
          <span
            style={{
              fontSize: "9px",
              color: "#7A5B35",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "6px",
            }}
          >
            TODAY
          </span>
          <TodayTimeline events={scheduleEvents} />
        </div>
      )}

      {/* Decorative label */}
      <div
        aria-hidden="true"
        className="absolute bottom-2 right-3"
        style={{
          fontSize: "8px",
          color: "#3D2E0A",
          fontFamily: "IBM Plex Mono, monospace",
          transform: "rotate(1.2deg)",
        }}
      >
        {"// COO METRICS"}
      </div>
    </div>
  );
}
