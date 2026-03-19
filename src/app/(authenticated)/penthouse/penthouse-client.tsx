"use client";

import { useState, useEffect, useRef, type JSX } from "react";
import { EntranceSequence } from "@/components/transitions/EntranceSequence";
import type {
  PenthouseStats,
  PipelineStageData,
  ActivityItemData,
} from "./penthouse-data";

/** Stat card display config */
interface StatCardConfig {
  label: string;
  value: string;
  icon: string;
  accentColor: string;
}

/**
 * PenthouseClient — The hero dashboard with glass-panel UI over immersive skyline.
 *
 * Every panel is a high-contrast glass surface that reads clearly against
 * the procedural city skyline. Panels have strong dark backgrounds with
 * gold accent borders and generous text contrast.
 */
export function PenthouseClient({
  userName,
  userEmail,
  stats,
  pipeline,
  activity,
}: {
  userName: string | null;
  userEmail: string;
  stats: PenthouseStats;
  pipeline: PipelineStageData[];
  activity: ActivityItemData[];
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
  const totalPipeline = pipeline.reduce((sum, s) => sum + s.count, 0);

  const statCards: StatCardConfig[] = [
    {
      label: "Applications",
      value: stats.totalApplications > 0 ? String(stats.totalApplications) : "—",
      icon: "📋",
      accentColor: "var(--gold)",
    },
    {
      label: "In Pipeline",
      value: stats.inPipeline > 0 ? String(stats.inPipeline) : "—",
      icon: "🔄",
      accentColor: "var(--info)",
    },
    {
      label: "Interviews",
      value: stats.interviews > 0 ? String(stats.interviews) : "—",
      icon: "🎯",
      accentColor: "var(--success)",
    },
    {
      label: "Response Rate",
      value: stats.totalApplications > 0 ? `${stats.responseRate}%` : "—%",
      icon: "📊",
      accentColor: "var(--warning)",
    },
  ];

  return (
    <EntranceSequence>
      <div className="flex min-h-dvh flex-col p-6 md:p-10 gap-6 max-w-5xl mx-auto">
        {/* ── HEADER ── */}
        <header className="space-y-2 pt-2">
          <h1
            className="text-2xl md:text-3xl tracking-tight"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: "var(--text-primary)",
              textShadow: "0 2px 20px rgba(0, 0, 0, 0.6)",
            }}
          >
            {greeting},{" "}
            <span style={{ color: "var(--gold)", textShadow: "0 0 20px rgba(201, 168, 76, 0.3)" }}>
              {displayName}
            </span>
          </h1>
          <p
            className="text-sm"
            style={{
              color: "var(--text-secondary)",
              textShadow: "0 1px 10px rgba(0, 0, 0, 0.8)",
            }}
          >
            The Penthouse — your command center overview
          </p>
        </header>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <GlassPanel
              key={stat.label}
              accentColor={stat.accentColor}
              className="p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs uppercase tracking-wider"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {stat.label}
                </span>
                <span className="text-sm">{stat.icon}</span>
              </div>
              <div className="flex items-end gap-2">
                <span
                  className="text-2xl"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: "tabular-nums lining-nums",
                    color: stat.accentColor,
                    textShadow: `0 0 15px color-mix(in srgb, ${stat.accentColor} 30%, transparent)`,
                  }}
                >
                  {stat.value}
                </span>
              </div>
            </GlassPanel>
          ))}
        </div>

        {/* ── PIPELINE VISUALIZATION ── */}
        <GlassPanel className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
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
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="text-3xl opacity-40">🏗️</div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No applications yet. Head to the War Room to start building your pipeline.
              </p>
            </div>
          ) : (
            <>
              <div
                className="flex h-3 rounded-full overflow-hidden"
                style={{ background: "rgba(255, 255, 255, 0.06)" }}
              >
                {pipeline.map((stage) =>
                  stage.count > 0 ? (
                    <div
                      key={stage.name}
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(stage.count / totalPipeline) * 100}%`,
                        backgroundColor: stage.color,
                        boxShadow: `0 0 8px ${stage.color}`,
                      }}
                    />
                  ) : null
                )}
              </div>
              <div className="flex flex-wrap gap-4">
                {pipeline.map((stage) => (
                  <div key={stage.name} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: stage.color,
                        boxShadow: `0 0 6px ${stage.color}`,
                      }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
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
        <GlassPanel className="p-6 space-y-4">
          <h2
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Recent Activity
          </h2>

          {activity.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="text-3xl opacity-40">📭</div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No activity yet. Your timeline will populate as you use The Tower.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg transition-all duration-200"
                  style={{
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.04)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(201, 168, 76, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                  }}
                >
                  <ActivityIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.title}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {item.description}
                    </p>
                  </div>
                  <span
                    className="shrink-0"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "var(--text-muted)",
                    }}
                  >
                    {item.timestamp}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>

        {/* ── QUICK ACTIONS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Add Application", desc: "Track a new opportunity", floor: "7" },
            { label: "Research Company", desc: "Get intelligence on a target", floor: "6" },
            { label: "Prep Interview", desc: "Generate a briefing packet", floor: "3" },
          ].map((action) => (
            <button
              key={action.label}
              disabled
              title="Coming soon — complete Phase 1+"
              className="text-left group cursor-default rounded-xl p-4 transition-all duration-200"
              style={{
                background: "rgba(10, 12, 25, 0.55)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                opacity: 0.5,
              }}
            >
              <div
                className="text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                {action.label}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                {action.desc}
              </div>
              <div
                className="mt-2"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  color: "var(--gold)",
                  opacity: 0.6,
                }}
              >
                FLOOR {action.floor}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pb-4">
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "0.15em",
              opacity: 0.5,
            }}
          >
            THE TOWER — PENTHOUSE LEVEL
          </p>
        </div>
      </div>
    </EntranceSequence>
  );
}

/**
 * GlassPanel — high-contrast glass surface that reads clearly against the skyline.
 *
 * Uses a solid-ish dark background (not just transparent glass) to ensure
 * text readability. Gold accent top border. Strong drop shadow for depth.
 */
function GlassPanel({
  children,
  className = "",
  accentColor,
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        background: "rgba(10, 12, 25, 0.78)",
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        borderTop: `2px solid ${accentColor ?? "rgba(201, 168, 76, 0.4)"}`,
        boxShadow:
          "0 16px 48px rgba(0, 0, 0, 0.45), 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      }}
    >
      {children}
    </div>
  );
}

function ActivityIcon({
  type,
}: {
  type: ActivityItemData["type"];
}): JSX.Element {
  const icons: Record<ActivityItemData["type"], string> = {
    application: "📋",
    email: "📧",
    interview: "🎯",
    follow_up: "↩️",
  };
  return <span className="text-sm shrink-0 mt-0.5">{icons[type]}</span>;
}
