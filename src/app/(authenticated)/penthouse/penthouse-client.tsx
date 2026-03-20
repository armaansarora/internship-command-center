"use client";
import { type JSX } from "react";
import { EntranceSequence } from "@/components/transitions/EntranceSequence";
import type { PenthouseStats, PipelineStageData, ActivityItemData } from "./penthouse-data";

import {
  IconBarChart,
  IconFlow,
  IconBullseye,
  IconTrendLine,
  IconPlus,
  IconSearch,
  IconDocument,
  IconLightning,
} from "@/components/icons/PenthouseIcons";
import { GlassPanel } from "@/components/penthouse/GlassPanel";
import { StatCard } from "@/components/penthouse/StatCard";
import type { StatCardConfig } from "@/components/penthouse/StatCard";
import { PipelineNodes, PipelineBar } from "@/components/penthouse/PipelineNodes";
import { ActivityFeed } from "@/components/penthouse/ActivityFeed";
import { QuickActionCard } from "@/components/penthouse/QuickActionCard";
import type { QuickActionConfig } from "@/components/penthouse/QuickActionCard";

/* ──────────────────────────────────────────────────────────────
   KEYFRAME CSS (injected once via <style>)
   Consumed by: StatCard (counter-pulse), PipelineNodes (flow-dot,
   pipeline-shimmer), ActivityFeed (radar-pulse, slide-in-left),
   GlassPanel (gold-underline-grow), PulseRing (pulse-ring-ph).
   ────────────────────────────────────────────────────────────── */

const KEYFRAMES = `
  @keyframes pulse-ring-ph {
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(2.6); opacity: 0;   }
  }
  @keyframes radar-pulse {
    0%   { transform: scale(0.8); opacity: 0.9; }
    50%  { transform: scale(1.5); opacity: 0.3; }
    100% { transform: scale(2.2); opacity: 0;   }
  }
  @keyframes pipeline-shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(400%);  }
  }
  @keyframes slide-in-left {
    from { opacity: 0; transform: translateX(-18px); }
    to   { opacity: 1; transform: translateX(0);     }
  }
  @keyframes counter-pulse {
    0%   { text-shadow: 0 0 18px var(--pulse-color, rgba(201,168,76,0.35)); }
    50%  { text-shadow: 0 0 32px var(--pulse-color, rgba(201,168,76,0.7)), 0 0 60px var(--pulse-color, rgba(201,168,76,0.3)); }
    100% { text-shadow: 0 0 18px var(--pulse-color, rgba(201,168,76,0.35)); }
  }
  @keyframes flow-dot {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.4); }
  }
  @keyframes gold-underline-grow {
    from { width: 0; opacity: 0; }
    to   { width: 64px; opacity: 1; }
  }
`;

/* ──────────────────────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────────────────────── */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Burning the midnight oil";
}

function formatHeaderDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/* ──────────────────────────────────────────────────────────────
   STATIC QUICK-ACTIONS CONFIG
   Hex values map to design tokens — kept as hex because these
   are inside complex inline style computations (opacity hex
   suffixes, rgba alpha overrides) that require the raw value.
   ────────────────────────────────────────────────────────────── */

const QUICK_ACTIONS: QuickActionConfig[] = [
  {
    label: "Add Application",
    desc: "Track a new opportunity in your pipeline",
    phase: "Phase 1",
    icon: <IconPlus />,
    accentColor: "#C9A84C",   /* --gold */
    glowColor: "rgba(201,168,76,0.15)",
    borderColor: "rgba(201,168,76,0.25)",
  },
  {
    label: "Research Company",
    desc: "Get intelligence on a target company",
    phase: "Phase 2",
    icon: <IconSearch />,
    accentColor: "#4C8FD4",   /* --info */
    glowColor: "rgba(76,143,212,0.12)",
    borderColor: "rgba(76,143,212,0.2)",
  },
  {
    label: "Prep Interview",
    desc: "Generate a briefing packet for your interview",
    phase: "Phase 2",
    icon: <IconDocument />,
    accentColor: "#4CAF7E",   /* --success */
    glowColor: "rgba(76,175,126,0.12)",
    borderColor: "rgba(76,175,126,0.2)",
  },
  {
    label: "Quick Outreach",
    desc: "Draft a cold email or follow-up message",
    phase: "Phase 3",
    icon: <IconLightning />,
    accentColor: "#9B6FD4",   /* --warning/purple accent */
    glowColor: "rgba(155,111,212,0.12)",
    borderColor: "rgba(155,111,212,0.2)",
  },
];

/* ──────────────────────────────────────────────────────────────
   PULSE RING — animated gold radar dot for floor indicator
   ────────────────────────────────────────────────────────────── */

function PulseRing(): JSX.Element {
  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: "14px", height: "14px" }}
      aria-hidden="true"
    >
      <span
        className="rounded-full"
        style={{
          width: "6px",
          height: "6px",
          background: "var(--gold)",
          boxShadow: "0 0 8px rgba(201, 168, 76, 0.7)", /* --gold glow */
          display: "block",
          position: "relative",
          zIndex: 1,
        }}
      />
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: "1px solid rgba(201, 168, 76, 0.45)", /* --gold */
          animation: "pulse-ring-ph 2.5s ease-out infinite",
        }}
      />
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: "1px solid rgba(201, 168, 76, 0.3)", /* --gold */
          animation: "pulse-ring-ph 2.5s ease-out infinite 1.25s",
        }}
      />
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────────── */

export interface PenthouseClientProps {
  userName: string | null;
  userEmail: string;
  stats: PenthouseStats;
  pipeline: PipelineStageData[];
  activity: ActivityItemData[];
}

export function PenthouseClient({
  userName,
  userEmail,
  stats,
  pipeline,
  activity,
}: PenthouseClientProps): JSX.Element {
  // BUG-008: removed mouse parallax on header text — text is now static

  const greeting = getGreeting();
  const headerDate = formatHeaderDate();
  const displayName = userName ?? userEmail.split("@")[0];
  const totalPipeline = pipeline.reduce((sum, s) => sum + s.count, 0);

  const statCards: StatCardConfig[] = [
    {
      label: "Applications",
      value: stats.totalApplications,
      suffix: "",
      icon: <IconBarChart />,
      accentColor: "var(--gold)",
    },
    {
      label: "In Pipeline",
      value: stats.inPipeline,
      suffix: "",
      icon: <IconFlow />,
      accentColor: "var(--info)",
    },
    {
      label: "Interviews",
      value: stats.interviews,
      suffix: "",
      icon: <IconBullseye />,
      accentColor: "var(--success)",
    },
    {
      label: "Response Rate",
      value: stats.totalApplications > 0 ? stats.responseRate : 0,
      suffix: "%",
      icon: <IconTrendLine />,
      accentColor: "var(--warning)",
    },
  ];

  return (
    <EntranceSequence>
      {/* Inject shared keyframe definitions once */}
      <style>{KEYFRAMES}</style>

      <div
        className="flex min-h-dvh flex-col p-6 md:p-10 gap-8 max-w-6xl mx-auto"
        aria-label="Penthouse dashboard"
      >
        {/* ── GREETING HEADER ── */}
        <header className="space-y-1 pt-2" aria-label="Penthouse dashboard header">
          <div
            className="flex items-center gap-2.5 mb-3"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.3em",
              color: "var(--gold)",
              opacity: 0.6,
            }}
          >
            <PulseRing />
            <span>FLOOR PH — THE PENTHOUSE</span>
          </div>

          <h1
            className="text-3xl md:text-4xl tracking-tight"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: "var(--text-primary)",
              textShadow: "0 2px 20px rgba(0, 0, 0, 0.6)",
              lineHeight: 1.2,
            }}
          >
            {greeting},{" "}
            <span
              style={{
                color: "var(--gold)",
                /* --gold glow: rgba(201,168,76,…) */
                textShadow:
                  "0 0 28px rgba(201, 168, 76, 0.4), 0 0 60px rgba(201, 168, 76, 0.15)",
              }}
            >
              {displayName}
            </span>
          </h1>

          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              marginTop: "6px",
            }}
          >
            {headerDate}
          </p>

          <div
            aria-hidden="true"
            style={{
              height: "1px",
              width: "64px",
              /* --gold gradient */
              background: "linear-gradient(to right, var(--gold), rgba(201,168,76,0))",
              marginTop: "14px",
              animation: "gold-underline-grow 0.8s ease-out 0.3s both",
            }}
          />
        </header>

        {/* ── STAT CARDS — 2×2 on mobile, 4-col on lg ── */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          role="group"
          aria-label="Dashboard statistics"
        >
          {statCards.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} delay={i * 120} />
          ))}
        </div>

        {/* ── MAIN 2-COLUMN GRID ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* LEFT COLUMN — Pipeline + Activity (2/3 width) */}
          <div className="xl:col-span-2 flex flex-col gap-6">

            {/* ── PIPELINE VISUALIZATION ── */}
            <GlassPanel className="p-7 space-y-6" delay={500}>
              <div className="flex items-center justify-between">
                <h2
                  className="text-base font-medium"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    color: "var(--text-primary)",
                    letterSpacing: "0.01em",
                  }}
                >
                  Application Pipeline
                </h2>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  {totalPipeline} total
                </span>
              </div>

              {totalPipeline === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div style={{ position: "relative", width: "48px", height: "48px" }}>
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        border: "1.5px solid rgba(201,168,76,0.35)", /* --gold */
                        animation: "radar-pulse 2.2s ease-out infinite",
                      }}
                    />
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: "8px",
                        borderRadius: "50%",
                        border: "1.5px solid rgba(201,168,76,0.5)", /* --gold */
                        animation: "radar-pulse 2.2s ease-out infinite 0.4s",
                      }}
                    />
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: "18px",
                        borderRadius: "50%",
                        background: "rgba(201,168,76,0.35)", /* --gold */
                      }}
                    />
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    No applications yet. Head to the War Room to start building your pipeline.
                  </p>
                </div>
              ) : (
                <>
                  <PipelineNodes pipeline={pipeline} totalPipeline={totalPipeline} />
                  <PipelineBar pipeline={pipeline} totalPipeline={totalPipeline} />

                  {/* Legend */}
                  <div className="flex flex-wrap gap-5">
                    {pipeline.map((stage) => (
                      <div key={stage.name} className="flex items-center gap-2">
                        <span
                          className="rounded-full"
                          aria-hidden="true"
                          style={{
                            display: "inline-block",
                            width: "8px",
                            height: "8px",
                            backgroundColor: stage.color,
                            boxShadow: `0 0 6px ${stage.color}`,
                            flexShrink: 0,
                          }}
                        />
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {stage.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "11px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {stage.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </GlassPanel>

            {/* ── RECENT ACTIVITY ── */}
            <GlassPanel className="p-7 space-y-4" delay={650}>
              <h2
                className="text-base font-medium"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: "var(--text-primary)",
                  letterSpacing: "0.01em",
                }}
              >
                Recent Activity
              </h2>
              <ActivityFeed activity={activity} />
            </GlassPanel>
          </div>

          {/* RIGHT COLUMN — Quick Actions (1/3 width) */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <h2
                className="text-base font-medium"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: "var(--text-primary)",
                  letterSpacing: "0.01em",
                }}
              >
                Quick Actions
              </h2>
            </div>

            <div
              className="grid grid-cols-2 xl:grid-cols-1 gap-4"
              role="group"
              aria-label="Quick actions"
            >
              {QUICK_ACTIONS.map((action, i) => (
                <QuickActionCard key={action.label} action={action} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="text-center pb-4">
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "0.2em",
              opacity: 0.4,
            }}
          >
            THE TOWER — PENTHOUSE LEVEL
          </p>
        </div>
      </div>
    </EntranceSequence>
  );
}
