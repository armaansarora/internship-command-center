"use client";

import type { JSX } from "react";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";
import type { TargetProfile } from "@/lib/agents/cro/target-profile";

export interface WhiteboardFinding {
  role: string;
  companyName: string;
  matchScore: number; // 0 - 1
  location: string | null;
}

export interface WhiteboardMemory {
  content: string;
  category: string;
}

interface CROWhiteboardProps {
  stats: PipelineStats;
  targetProfile?: TargetProfile | null;
  topDiscovered?: WhiteboardFinding[];
  latestMemory?: WhiteboardMemory | null;
}

const PIPELINE_STAGES: Array<{ key: string; label: string; color: string }> = [
  { key: "applied", label: "APPL", color: "#1E90FF" },
  { key: "screening", label: "SCR", color: "#00D4FF" },
  { key: "interview_scheduled", label: "SCHED", color: "#F59E0B" },
  { key: "interviewing", label: "INTV", color: "#F59E0B" },
  { key: "under_review", label: "REVW", color: "#9B59B6" },
  { key: "offer", label: "OFR", color: "#00FF87" },
];

// ---------------------------------------------------------------------------
// Sub-panels
// ---------------------------------------------------------------------------

function TargetBrief({
  targetProfile,
}: {
  targetProfile: TargetProfile | null | undefined;
}): JSX.Element {
  if (!targetProfile) {
    return (
      <p
        style={{
          fontSize: "10px",
          color: "#7FB3D3",
          fontFamily: "IBM Plex Mono, monospace",
          letterSpacing: "0.04em",
          lineHeight: 1.5,
        }}
      >
        no target on record — intake pending
      </p>
    );
  }
  const roles = targetProfile.roles.slice(0, 2).join(" · ");
  const geos = targetProfile.geos.slice(0, 3).join(" · ");
  const companies = targetProfile.companies.slice(0, 4).join(" · ");
  return (
    <div className="flex flex-col gap-0.5">
      <span
        style={{
          fontSize: "11px",
          color: "#E8F4FD",
          fontFamily: "IBM Plex Mono, monospace",
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        {roles}
      </span>
      <span
        style={{
          fontSize: "9px",
          color: "#7FB3D3",
          fontFamily: "IBM Plex Mono, monospace",
        }}
      >
        {geos}
      </span>
      {companies && (
        <span
          style={{
            fontSize: "9px",
            color: "#4A7A9B",
            fontFamily: "IBM Plex Mono, monospace",
            letterSpacing: "0.02em",
          }}
        >
          eye on: {companies}
          {targetProfile.companies.length > 4 ? "…" : ""}
        </span>
      )}
    </div>
  );
}

function FindingRow({
  finding,
}: {
  finding: WhiteboardFinding;
}): JSX.Element {
  const pct = Math.round(finding.matchScore * 100);
  // Glow intensity scales with score. Keeps the ribbon earned.
  const glow = Math.max(0, finding.matchScore - 0.5) * 2; // 0 - 1
  return (
    <div
      role="group"
      aria-label={`${finding.role} at ${finding.companyName}, match ${pct} percent`}
      className="flex items-center justify-between gap-2"
    >
      <div className="min-w-0 flex-1">
        <div
          style={{
            fontSize: "10px",
            color: "#E8F4FD",
            fontFamily: "IBM Plex Mono, monospace",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {finding.role}
        </div>
        <div
          style={{
            fontSize: "9px",
            color: "#7FB3D3",
            fontFamily: "IBM Plex Mono, monospace",
          }}
        >
          {finding.companyName}
          {finding.location ? ` · ${finding.location}` : ""}
        </div>
      </div>
      <div
        aria-hidden="true"
        style={{
          flexShrink: 0,
          fontSize: "11px",
          fontFamily: "IBM Plex Mono, monospace",
          fontWeight: 700,
          color: "#00D4FF",
          padding: "2px 6px",
          borderRadius: "1px",
          background: `rgba(30, 144, 255, ${0.1 + glow * 0.18})`,
          boxShadow: `0 0 ${Math.round(glow * 10)}px rgba(30, 144, 255, ${0.25 +
            glow * 0.4})`,
          letterSpacing: "0.04em",
          transition: "box-shadow 0.4s ease, background 0.4s ease",
        }}
      >
        {pct}
      </div>
    </div>
  );
}

function LatestNote({
  memory,
}: {
  memory: WhiteboardMemory | null | undefined;
}): JSX.Element | null {
  if (!memory) return null;
  const label =
    memory.category === "pattern"
      ? "CRO // PATTERN"
      : memory.category === "feedback"
        ? "CRO // FEEDBACK"
        : memory.category === "preference"
          ? "CRO // NOTE"
          : "CRO // OBS";
  return (
    <div className="flex flex-col gap-0.5">
      <span
        style={{
          fontSize: "8px",
          color: "#4A7A9B",
          fontFamily: "IBM Plex Mono, monospace",
          letterSpacing: "0.12em",
          transform: "rotate(-0.3deg)",
          display: "inline-block",
        }}
      >
        {label}
      </span>
      <p
        style={{
          fontSize: "10px",
          color: "#E8F4FD",
          fontFamily: "IBM Plex Mono, monospace",
          letterSpacing: "0.02em",
          lineHeight: 1.45,
        }}
      >
        {memory.content.length > 140
          ? `${memory.content.slice(0, 140).trim()}…`
          : memory.content}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline funnel bar — retained, smaller, below the living data
// ---------------------------------------------------------------------------
function PipelineFunnelBar({ stats }: { stats: PipelineStats }): JSX.Element {
  const stageCounts = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: stats.byStatus[s.key] ?? 0,
  }));
  const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);
  return (
    <div
      role="img"
      aria-label="Pipeline funnel showing application counts by stage"
      className="w-full"
    >
      <div className="flex items-end gap-1 h-8">
        {stageCounts.map((stage) => {
          const heightPct = (stage.count / maxCount) * 100;
          return (
            <div
              key={stage.key}
              className="flex flex-col items-center flex-1 gap-0.5"
            >
              <span
                aria-hidden="true"
                style={{
                  color: stage.color,
                  fontSize: "8px",
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              >
                {stage.count}
              </span>
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${Math.max(heightPct * 0.22, stage.count > 0 ? 3 : 2)}px`,
                  backgroundColor: stage.color,
                  opacity: stage.count > 0 ? 0.85 : 0.18,
                  transition: "height 0.4s ease-out",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-0.5">
        {stageCounts.map((stage) => (
          <div key={stage.key} className="flex-1 text-center">
            <span
              style={{
                color: "#4A7A9B",
                fontSize: "7px",
                fontFamily: "IBM Plex Mono, monospace",
                letterSpacing: "0.05em",
              }}
            >
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main whiteboard
// ---------------------------------------------------------------------------
export function CROWhiteboard({
  stats,
  targetProfile,
  topDiscovered,
  latestMemory,
}: CROWhiteboardProps): JSX.Element {
  const discovered = (topDiscovered ?? []).slice(0, 3);

  return (
    <div
      role="region"
      aria-label="CRO pipeline whiteboard"
      className="relative rounded-md p-4 w-full"
      style={{
        backgroundColor: "#0A1628",
        border: "1px solid #1E3A5F",
        boxShadow: "inset 0 0 24px rgba(30, 144, 255, 0.04)",
        fontFamily: "IBM Plex Mono, monospace",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          style={{
            fontSize: "10px",
            color: "#7FB3D3",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            transform: "rotate(-0.3deg)",
            display: "inline-block",
          }}
        >
          WAR TABLE // LIVE
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "#1E90FF",
            fontWeight: 700,
          }}
          aria-label={`Total active: ${stats.total}`}
        >
          {stats.total} OPS
        </span>
      </div>

      {/* Target brief */}
      <div className="mb-3">
        <div
          aria-hidden="true"
          style={{
            fontSize: "8px",
            color: "#4A7A9B",
            letterSpacing: "0.14em",
            marginBottom: "3px",
          }}
        >
          TARGET BRIEF
        </div>
        <TargetBrief targetProfile={targetProfile} />
      </div>

      {/* Discovered finds */}
      {discovered.length > 0 && (
        <div
          className="mb-3 pt-2 border-t"
          style={{ borderColor: "#1E3A5F" }}
        >
          <div
            aria-hidden="true"
            style={{
              fontSize: "8px",
              color: "#4A7A9B",
              letterSpacing: "0.14em",
              marginBottom: "5px",
            }}
          >
            TOP FINDS
          </div>
          <div className="flex flex-col gap-2">
            {discovered.map((f) => (
              <FindingRow key={`${f.companyName}-${f.role}`} finding={f} />
            ))}
          </div>
        </div>
      )}

      {/* Latest CRO note */}
      {latestMemory && (
        <div
          className="mb-3 pt-2 border-t"
          style={{ borderColor: "#1E3A5F" }}
        >
          <LatestNote memory={latestMemory} />
        </div>
      )}

      {/* Compact funnel */}
      <div className="pt-2 border-t" style={{ borderColor: "#1E3A5F" }}>
        <PipelineFunnelBar stats={stats} />
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-2 right-3"
        style={{
          fontSize: "8px",
          color: "#1E3A5F",
          fontFamily: "IBM Plex Mono, monospace",
          transform: "rotate(1.2deg)",
        }}
      >
        {"// CRO WHITEBOARD"}
      </div>
    </div>
  );
}
