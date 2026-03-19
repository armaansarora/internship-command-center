"use client";

import { useState, useEffect, type JSX } from "react";
import { EntranceSequence } from "@/components/transitions/EntranceSequence";

/** Dashboard stat card data shape */
interface StatCard {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: "up" | "down" | "flat";
  icon: string;
}

/** Activity feed item */
interface ActivityItem {
  id: string;
  type: "application" | "email" | "interview" | "follow_up";
  title: string;
  description: string;
  timestamp: string;
}

/** Pipeline stage counts */
interface PipelineStage {
  name: string;
  count: number;
  color: string;
}

/**
 * Placeholder data — will be replaced with real Supabase queries.
 */
const PLACEHOLDER_STATS: StatCard[] = [
  { label: "Applications", value: "—", icon: "📋" },
  { label: "In Pipeline", value: "—", icon: "🔄" },
  { label: "Interviews", value: "—", icon: "🎯" },
  { label: "Response Rate", value: "—%", icon: "📊" },
];

const PLACEHOLDER_PIPELINE: PipelineStage[] = [
  { name: "Saved", count: 0, color: "var(--text-muted)" },
  { name: "Applied", count: 0, color: "var(--info)" },
  { name: "Screen", count: 0, color: "var(--warning)" },
  { name: "Interview", count: 0, color: "var(--gold)" },
  { name: "Offer", count: 0, color: "var(--success)" },
];

const PLACEHOLDER_ACTIVITY: ActivityItem[] = [];

/**
 * PenthouseClient — The hero dashboard with glass-panel UI over immersive skyline.
 *
 * Layout:
 * - Wrapped in EntranceSequence for cinematic first-login
 * - Glass panel containers over the photorealistic NYC skyline background
 * - Top: Greeting + time-of-day awareness
 * - Middle: 4 stat cards (glass + gold accents)
 * - Pipeline: Visual pipeline bar
 * - Bottom: Recent activity feed + quick actions
 */
export function PenthouseClient({
  userName,
  userEmail,
}: {
  userName: string | null;
  userEmail: string;
}): JSX.Element {
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Good morning");
    else if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else if (hour >= 17 && hour < 21) setGreeting("Good evening");
    else setGreeting("Burning the midnight oil");
  }, []);

  const displayName = userName ?? userEmail.split("@")[0];
  const stats = PLACEHOLDER_STATS;
  const pipeline = PLACEHOLDER_PIPELINE;
  const activity = PLACEHOLDER_ACTIVITY;
  const totalPipeline = pipeline.reduce((sum, s) => sum + s.count, 0);

  return (
    <EntranceSequence>
      <div className="flex min-h-dvh flex-col p-6 md:p-10 gap-6 max-w-5xl mx-auto">
        {/* ── Header ── */}
        <header className="space-y-2 pt-2">
          <h1 className="text-display text-xl">
            {greeting},{" "}
            <span className="text-[var(--gold)]">{displayName}</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            The Penthouse — your command center overview
          </p>
        </header>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass-card gold-border-top p-5 flex flex-col gap-3 backdrop-blur-xl"
              style={{
                background: "rgba(26, 26, 46, 0.65)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                  {stat.label}
                </span>
                <span className="text-sm">{stat.icon}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-data text-2xl text-[var(--gold)]">
                  {stat.value}
                </span>
                {stat.delta && (
                  <span
                    className={[
                      "text-data text-xs mb-1",
                      stat.deltaDirection === "up"
                        ? "text-[var(--success)]"
                        : stat.deltaDirection === "down"
                          ? "text-[var(--error)]"
                          : "text-[var(--text-muted)]",
                    ].join(" ")}
                  >
                    {stat.deltaDirection === "up"
                      ? "↑"
                      : stat.deltaDirection === "down"
                        ? "↓"
                        : "→"}
                    {stat.delta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Pipeline Visualization ── */}
        <div
          className="glass-card p-6 space-y-4 backdrop-blur-xl"
          style={{
            background: "rgba(26, 26, 46, 0.6)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--text-primary)]">
              Application Pipeline
            </h2>
            <span className="text-data text-xs text-[var(--text-muted)]">
              {totalPipeline} total
            </span>
          </div>

          {totalPipeline === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="text-3xl opacity-30">🏗️</div>
              <p className="text-sm text-[var(--text-muted)]">
                No applications yet. Head to the War Room to start building your
                pipeline.
              </p>
            </div>
          ) : (
            <>
              {/* Pipeline bar */}
              <div className="flex h-3 rounded-full overflow-hidden bg-[var(--tower-surface)]">
                {pipeline.map((stage) =>
                  stage.count > 0 ? (
                    <div
                      key={stage.name}
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(stage.count / totalPipeline) * 100}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  ) : null,
                )}
              </div>

              {/* Pipeline legend */}
              <div className="flex flex-wrap gap-4">
                {pipeline.map((stage) => (
                  <div key={stage.name} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-xs text-[var(--text-secondary)]">
                      {stage.name}
                    </span>
                    <span className="text-data text-xs text-[var(--text-muted)]">
                      {stage.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Recent Activity ── */}
        <div
          className="glass-card p-6 space-y-4 backdrop-blur-xl"
          style={{
            background: "rgba(26, 26, 46, 0.6)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            Recent Activity
          </h2>

          {activity.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="text-3xl opacity-30">📭</div>
              <p className="text-sm text-[var(--text-muted)]">
                No activity yet. Your timeline will populate as you use The
                Tower.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors"
                >
                  <ActivityIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {item.description}
                    </p>
                  </div>
                  <span className="text-data text-[10px] text-[var(--text-muted)] shrink-0">
                    {item.timestamp}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Add Application",
              desc: "Track a new opportunity",
              floor: "7",
            },
            {
              label: "Research Company",
              desc: "Get intelligence on a target",
              floor: "6",
            },
            {
              label: "Prep Interview",
              desc: "Generate a briefing packet",
              floor: "3",
            },
          ].map((action) => (
            <button
              key={action.label}
              className="glass glass-hover p-4 text-left group cursor-default opacity-50 backdrop-blur-xl"
              disabled
              title="Coming soon — complete Phase 1+"
              style={{
                background: "rgba(26, 26, 46, 0.5)",
              }}
            >
              <div className="text-sm text-[var(--text-primary)] group-hover:text-[var(--gold)] transition-colors">
                {action.label}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                {action.desc}
              </div>
              <div className="text-data text-[10px] text-[var(--gold)] mt-2 opacity-60">
                FLOOR {action.floor}
              </div>
            </button>
          ))}
        </div>

        {/* Footer badge */}
        <div className="text-center pb-4">
          <p className="text-data text-[10px] text-[var(--text-muted)] tracking-[0.15em] opacity-60">
            THE TOWER — PENTHOUSE LEVEL
          </p>
        </div>
      </div>
    </EntranceSequence>
  );
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }): JSX.Element {
  const icons: Record<ActivityItem["type"], string> = {
    application: "📋",
    email: "📧",
    interview: "🎯",
    follow_up: "↩️",
  };
  return <span className="text-sm shrink-0 mt-0.5">{icons[type]}</span>;
}
