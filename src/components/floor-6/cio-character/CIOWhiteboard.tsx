"use client";

import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Types — derived from ResearchStats from companies-rest.ts
// ---------------------------------------------------------------------------
interface ResearchedCompany {
  id: string;
  name: string;
  sector: string | null;
  lastResearchedAt: Date | null;
  hasNotes: boolean;
  domain: string | null;
}

interface ResearchStats {
  totalCompanies: number;
  researchedCount: number;
  staleCount: number;
  freshCount: number;
  recentActivity: Array<{
    companyName: string;
    action: string;
    at: Date;
  }>;
  companies: ResearchedCompany[];
}

interface CIOWhiteboardProps {
  researchStats: ResearchStats;
}

// ---------------------------------------------------------------------------
// Research freshness — green (<7 days), yellow (7-30 days), red (>30 days)
// ---------------------------------------------------------------------------
type FreshnessLevel = "fresh" | "stale" | "old" | "unknown";

function getFreshnessLevel(lastResearchedAt: Date | null): FreshnessLevel {
  if (!lastResearchedAt) return "unknown";
  const now = Date.now();
  const diffMs = now - lastResearchedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 7) return "fresh";
  if (diffDays <= 30) return "stale";
  return "old";
}

function getFreshnessColor(level: FreshnessLevel): string {
  // R8: dossiers yellow and curl with age, they don't turn red.  Fresh is
  // still a green "active" signal, but staleness walks through aging paper
  // colors rather than a warning ramp.
  switch (level) {
    case "fresh":
      return "#22C55E";
    case "stale":
      return "#A68E5E";
    case "old":
      return "#8C6D3F";
    case "unknown":
      return "#334155";
  }
}

function getFreshnessLabel(level: FreshnessLevel): string {
  switch (level) {
    case "fresh":
      return "FRESH";
    case "stale":
      return "STALE";
    case "old":
      return "OLD";
    case "unknown":
      return "NONE";
  }
}

function formatDaysAgo(date: Date | null): string {
  if (!date) return "Never";
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w ago`;
}

// ---------------------------------------------------------------------------
// Company dossier card — compact grid item
// ---------------------------------------------------------------------------
function DossierCard({
  company,
}: {
  company: ResearchedCompany;
}): JSX.Element {
  const freshness = getFreshnessLevel(company.lastResearchedAt);
  const freshnessColor = getFreshnessColor(freshness);
  const freshnessLabel = getFreshnessLabel(freshness);
  const daysAgo = formatDaysAgo(company.lastResearchedAt);

  return (
    <div
      role="listitem"
      aria-label={`${company.name} research dossier — ${freshnessLabel}`}
      style={{
        backgroundColor: "#0A1628",
        border: `1px solid ${freshnessColor}28`,
        borderLeft: `2px solid ${freshnessColor}`,
        borderRadius: "4px",
        padding: "6px 8px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Freshness indicator dot */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <span
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "10px",
            fontWeight: 600,
            color: "#CBD5E1",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "80%",
          }}
        >
          {company.name}
        </span>
        <span
          aria-label={`Research freshness: ${freshnessLabel}`}
          style={{
            fontSize: "8px",
            fontFamily: "IBM Plex Mono, monospace",
            color: freshnessColor,
            letterSpacing: "0.06em",
            flexShrink: 0,
          }}
        >
          {freshnessLabel}
        </span>
      </div>

      {/* Sector + timing row */}
      <div className="flex items-center justify-between">
        {company.sector && (
          <span
            style={{
              fontSize: "9px",
              fontFamily: "IBM Plex Mono, monospace",
              color: "#334155",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "60%",
            }}
          >
            {company.sector}
          </span>
        )}
        <span
          style={{
            fontSize: "9px",
            fontFamily: "IBM Plex Mono, monospace",
            color: "#1E3A5F",
            marginLeft: "auto",
          }}
        >
          {daysAgo}
        </span>
      </div>

      {/* Notes indicator */}
      {company.hasNotes && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "4px",
            right: "40px",
            width: "3px",
            height: "3px",
            borderRadius: "50%",
            backgroundColor: "#3B82F6",
            opacity: 0.6,
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Freshness legend
// ---------------------------------------------------------------------------
function FreshnessLegend(): JSX.Element {
  const levels: Array<{ level: FreshnessLevel; label: string }> = [
    { level: "fresh", label: "< 7d" },
    { level: "stale", label: "7–30d" },
    { level: "old", label: "> 30d" },
    { level: "unknown", label: "None" },
  ];

  return (
    <div
      className="flex items-center gap-3"
      role="group"
      aria-label="Research freshness legend"
    >
      {levels.map(({ level, label }) => (
        <div key={level} className="flex items-center gap-1">
          <div
            aria-hidden="true"
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "1px",
              backgroundColor: getFreshnessColor(level),
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "8px",
              fontFamily: "IBM Plex Mono, monospace",
              color: "#334155",
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat badge
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
          color: "#1E3A5F",
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
// Recent activity log
// ---------------------------------------------------------------------------
function ActivityLog({
  activity,
}: {
  activity: ResearchStats["recentActivity"];
}): JSX.Element {
  if (activity.length === 0) {
    return (
      <div
        style={{
          fontSize: "10px",
          fontFamily: "IBM Plex Mono, monospace",
          color: "#1E3A5F",
          fontStyle: "italic",
        }}
      >
        No recent activity
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Recent research activity"
      className="flex flex-col gap-1"
    >
      {activity.slice(0, 4).map((item, i) => {
        const timeStr = formatDaysAgo(new Date(item.at));
        return (
          <div
            key={i}
            role="listitem"
            className="flex items-center gap-2"
          >
            <div
              aria-hidden="true"
              style={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                backgroundColor: "#3B82F6",
                flexShrink: 0,
                opacity: 0.6,
              }}
            />
            <span
              style={{
                fontSize: "9px",
                fontFamily: "IBM Plex Mono, monospace",
                color: "#60A5FA",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {item.companyName}
            </span>
            <span
              style={{
                fontSize: "9px",
                fontFamily: "IBM Plex Mono, monospace",
                color: "#1E3A5F",
                flexShrink: 0,
              }}
            >
              {timeStr}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main whiteboard component
// ---------------------------------------------------------------------------
export function CIOWhiteboard({
  researchStats,
}: CIOWhiteboardProps): JSX.Element {
  const coveragePercent =
    researchStats.totalCompanies > 0
      ? Math.round(
          (researchStats.researchedCount / researchStats.totalCompanies) * 100
        )
      : 0;

  return (
    <div
      role="region"
      aria-label="CIO research intelligence whiteboard"
      className="relative rounded-md p-4 w-full"
      style={{
        backgroundColor: "#0D1B2A",
        border: "1px solid #1E3A5F",
        boxShadow: "inset 0 0 24px rgba(59, 130, 246, 0.04)",
        fontFamily: "IBM Plex Mono, monospace",
      }}
    >
      {/* Board header */}
      <div className="flex items-center justify-between mb-3">
        <span
          style={{
            fontSize: "10px",
            color: "#60A5FA",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            display: "inline-block",
          }}
        >
          INTEL BOARD // LIVE
        </span>
        <span
          style={{
            fontSize: "11px",
            fontFamily: "IBM Plex Mono, monospace",
            fontWeight: 700,
            color: coveragePercent >= 70 ? "#22C55E" : coveragePercent >= 40 ? "#A68E5E" : "#8892A0",
          }}
          aria-label={`Research coverage: ${coveragePercent} percent`}
        >
          {coveragePercent}%
        </span>
      </div>

      {/* Stats row */}
      <div
        className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 border-b pb-3"
        style={{ borderColor: "#1E3A5F" }}
      >
        <StatBadge
          label="TRACKED"
          value={researchStats.totalCompanies}
          valueColor="#60A5FA"
        />
        <StatBadge
          label="RESEARCHED"
          value={researchStats.researchedCount}
          valueColor="#3B82F6"
        />
        <StatBadge
          label="FRESH"
          value={researchStats.freshCount}
          valueColor="#22C55E"
        />
        <StatBadge
          label="STALE"
          value={researchStats.staleCount}
          valueColor={researchStats.staleCount > 0 ? "#A68E5E" : "#1E3A5F"}
        />
      </div>

      {/* Freshness legend */}
      <div className="mb-3">
        <FreshnessLegend />
      </div>

      {/* Company dossiers grid */}
      {researchStats.companies.length > 0 && (
        <div
          className="mb-3 border-t pt-3"
          style={{ borderColor: "#1E3A5F" }}
        >
          <span
            style={{
              fontSize: "9px",
              color: "#1E3A5F",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "6px",
            }}
          >
            COMPANY DOSSIERS
          </span>
          <div
            role="list"
            aria-label="Company research dossiers"
            className="grid grid-cols-1 gap-1.5"
          >
            {researchStats.companies.slice(0, 5).map((company) => (
              <DossierCard key={company.id} company={company} />
            ))}
          </div>
        </div>
      )}

      {/* Recent research activity */}
      {researchStats.recentActivity.length > 0 && (
        <div
          className="border-t pt-3"
          style={{ borderColor: "#1E3A5F" }}
        >
          <span
            style={{
              fontSize: "9px",
              color: "#1E3A5F",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "6px",
            }}
          >
            RECENT ACTIVITY
          </span>
          <ActivityLog activity={researchStats.recentActivity} />
        </div>
      )}

      {/* Decorative label */}
      <div
        aria-hidden="true"
        className="absolute bottom-2 right-3"
        style={{
          fontSize: "8px",
          color: "#1E3A5F",
          fontFamily: "IBM Plex Mono, monospace",
          transform: "rotate(1deg)",
        }}
      >
        {"// CIO INTEL"}
      </div>
    </div>
  );
}
