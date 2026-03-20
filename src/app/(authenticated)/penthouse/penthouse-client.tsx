"use client";
import { useState, useEffect, useRef, useCallback, type JSX } from "react";
import { EntranceSequence } from "@/components/transitions/EntranceSequence";
import type { PenthouseStats, PipelineStageData, ActivityItemData } from "./penthouse-data";

/* ──────────────────────────────────────────────────────────────
   NOISE TEXTURE (SVG data URI — used as CSS background overlay)
   ────────────────────────────────────────────────────────────── */

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`;

/* ──────────────────────────────────────────────────────────────
   KEYFRAME CSS (injected once via <style>)
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
   HOOKS
   ────────────────────────────────────────────────────────────── */

/** useCountUp — animates from 0 to target over 1500ms with cubic ease-out */
function useCountUp(target: number): { display: number; pulsing: boolean } {
  const [display, setDisplay] = useState(0);
  const [pulsing, setPulsing] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setDisplay(0);
      return;
    }
    startRef.current = performance.now();
    const duration = 1500;

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Trigger glow pulse when counting finishes
        setPulsing(true);
        setTimeout(() => setPulsing(false), 800);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return { display, pulsing };
}

/** getGreeting — returns time-appropriate greeting */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Burning the midnight oil";
}

/** formatHeaderDate — e.g. "Thursday, March 19" */
function formatHeaderDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/* ──────────────────────────────────────────────────────────────
   TINY SVG ICON COMPONENTS (16×16)
   ────────────────────────────────────────────────────────────── */

function IconBarChart(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <rect x="1" y="9" width="3.5" height="6" rx="0.5" fill="var(--gold)" opacity="0.55" />
      <rect x="6.25" y="5" width="3.5" height="10" rx="0.5" fill="var(--gold)" opacity="0.75" />
      <rect x="11.5" y="2" width="3.5" height="13" rx="0.5" fill="var(--gold)" opacity="1" />
    </svg>
  );
}

function IconFlow(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <circle cx="2.5" cy="8" r="2" fill="var(--info)" opacity="0.9" />
      <line x1="4.5" y1="8" x2="6.5" y2="8" stroke="var(--info)" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="8" cy="8" r="2" fill="var(--info)" opacity="0.9" />
      <line x1="10" y1="8" x2="12" y2="8" stroke="var(--info)" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="13.5" cy="8" r="2" fill="var(--info)" opacity="0.9" />
    </svg>
  );
}

function IconBullseye(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="var(--success)" strokeWidth="1.2" opacity="0.55" />
      <circle cx="8" cy="8" r="3.5" stroke="var(--success)" strokeWidth="1.4" opacity="0.85" />
      <circle cx="8" cy="8" r="1.5" fill="var(--success)" opacity="1" />
    </svg>
  );
}

function IconTrendLine(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <polyline points="1,12 5,9 9,5.5 13,3" stroke="var(--warning)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx="13" cy="3" r="2" fill="var(--warning)" opacity="1" />
    </svg>
  );
}

/* Quick-action icons (20×20) */
function IconPlus(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <line x1="10" y1="3" x2="10" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconDocument(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="1.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <line x1="6.5" y1="6.5" x2="13.5" y2="6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <line x1="6.5" y1="9.5" x2="13.5" y2="9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <line x1="6.5" y1="12.5" x2="10.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function IconLightning(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <polyline points="12,2 6,11 10,11 8,18 14,9 10,9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Activity type dot */
function ActivityDot({ type }: { type: ActivityItemData["type"] }): JSX.Element {
  const colorMap: Record<ActivityItemData["type"], string> = {
    application: "var(--gold)",
    email: "var(--info)",
    interview: "var(--success)",
    follow_up: "var(--warning)",
  };
  const color = colorMap[type];
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 6px ${color}`,
        flexShrink: 0,
        marginTop: "6px",
        position: "relative",
        zIndex: 1,
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────
   STAT CARD CONFIG
   ────────────────────────────────────────────────────────────── */

interface StatCardConfig {
  label: string;
  value: number;
  suffix: string;
  icon: JSX.Element;
  accentColor: string;
}

/* ──────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────────── */

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

  const quickActions = [
    {
      label: "Add Application",
      desc: "Track a new opportunity in your pipeline",
      phase: "Phase 1",
      icon: <IconPlus />,
      accentColor: "#C9A84C",
      glowColor: "rgba(201,168,76,0.15)",
      borderColor: "rgba(201,168,76,0.25)",
    },
    {
      label: "Research Company",
      desc: "Get intelligence on a target company",
      phase: "Phase 2",
      icon: <IconSearch />,
      accentColor: "#4C8FD4",
      glowColor: "rgba(76,143,212,0.12)",
      borderColor: "rgba(76,143,212,0.2)",
    },
    {
      label: "Prep Interview",
      desc: "Generate a briefing packet for your interview",
      phase: "Phase 2",
      icon: <IconDocument />,
      accentColor: "#4CAF7E",
      glowColor: "rgba(76,175,126,0.12)",
      borderColor: "rgba(76,175,126,0.2)",
    },
    {
      label: "Quick Outreach",
      desc: "Draft a cold email or follow-up message",
      phase: "Phase 3",
      icon: <IconLightning />,
      accentColor: "#9B6FD4",
      glowColor: "rgba(155,111,212,0.12)",
      borderColor: "rgba(155,111,212,0.2)",
    },
  ];

  return (
    <EntranceSequence>
      {/* Inject keyframes once */}
      <style>{KEYFRAMES}</style>

      <div
        className="flex min-h-dvh flex-col p-6 md:p-10 gap-8 max-w-6xl mx-auto"
        aria-label="Penthouse dashboard"
      >
        {/* ── GREETING HEADER ── */}
        <header
          className="space-y-1 pt-2"
          aria-label="Penthouse dashboard header"
        >
          {/* Floor label with pulse ring */}
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

          {/* Greeting in Playfair Display */}
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
                textShadow:
                  "0 0 28px rgba(201, 168, 76, 0.4), 0 0 60px rgba(201, 168, 76, 0.15)",
              }}
            >
              {displayName}
            </span>
          </h1>

          {/* Date in JetBrains Mono */}
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

          {/* Gold underline separator */}
          <div
            style={{
              height: "1px",
              width: "64px",
              background: "linear-gradient(to right, var(--gold), rgba(201,168,76,0))",
              marginTop: "14px",
              animation: "gold-underline-grow 0.8s ease-out 0.3s both",
            }}
            aria-hidden="true"
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

          {/* LEFT COLUMN — Pipeline + Activity (takes 2/3 width) */}
          <div className="xl:col-span-2 flex flex-col gap-6">

            {/* ── PIPELINE VISUALIZATION ── */}
            <GlassPanel className="p-7 space-y-6" delay={500}>
              {/* Heading row */}
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
                        border: "1.5px solid rgba(201,168,76,0.35)",
                        animation: "radar-pulse 2.2s ease-out infinite",
                      }}
                    />
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: "8px",
                        borderRadius: "50%",
                        border: "1.5px solid rgba(201,168,76,0.5)",
                        animation: "radar-pulse 2.2s ease-out infinite 0.4s",
                      }}
                    />
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: "18px",
                        borderRadius: "50%",
                        background: "rgba(201,168,76,0.35)",
                      }}
                    />
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    No applications yet. Head to the War Room to start building your pipeline.
                  </p>
                </div>
              ) : (
                <>
                  {/* Stage nodes with connecting gold gradient line */}
                  <PipelineNodes pipeline={pipeline} totalPipeline={totalPipeline} />

                  {/* Progress bar with shimmer */}
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

              {activity.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  {/* Pulsing radar animation */}
                  <div
                    aria-hidden="true"
                    style={{ position: "relative", width: "56px", height: "56px" }}
                  >
                    {[0, 0.5, 1].map((delay, i) => (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50%",
                          border: "1.5px solid rgba(201,168,76,0.4)",
                          animation: `radar-pulse 2.5s ease-out infinite ${delay}s`,
                        }}
                      />
                    ))}
                    <div
                      style={{
                        position: "absolute",
                        inset: "22px",
                        borderRadius: "50%",
                        background: "var(--gold)",
                        opacity: 0.6,
                      }}
                    />
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    No activity yet. Your timeline will populate as you use The Tower.
                  </p>
                </div>
              ) : (
                <div
                  className="relative"
                  role="list"
                  aria-label="Recent activity list"
                  style={{ paddingLeft: "20px" }}
                >
                  {/* Vertical gold gradient timeline line */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "3px",
                      top: "8px",
                      bottom: "8px",
                      width: "1px",
                      background:
                        "linear-gradient(to bottom, var(--gold), rgba(201,168,76,0.3), transparent)",
                      opacity: 0.4,
                    }}
                  />
                  <div className="space-y-1">
                    {activity.map((item, i) => (
                      <ActivityRow key={item.id} item={item} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </GlassPanel>
          </div>

          {/* RIGHT COLUMN — Quick Actions (takes 1/3 width) */}
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

            {/* 2×2 grid of quick action cards */}
            <div
              className="grid grid-cols-2 xl:grid-cols-1 gap-4"
              role="group"
              aria-label="Quick actions"
            >
              {quickActions.map((action, i) => (
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

/* ──────────────────────────────────────────────────────────────
   GLASS PANEL — with noise texture, hover inner glow, border brighten
   ────────────────────────────────────────────────────────────── */

function GlassPanel({
  children,
  className = "",
  accentColor,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
  delay?: number;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg) scale(1.01)`;
    el.style.boxShadow = `
      0 20px 60px rgba(0, 0, 0, 0.55),
      0 0 1px rgba(255, 255, 255, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      inset 0 0 40px rgba(201, 168, 76, 0.04),
      ${x * 36}px ${y * 36}px 70px rgba(201, 168, 76, 0.07),
      0 0 0 1px rgba(201, 168, 76, 0.08)
    `;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)";
    el.style.boxShadow =
      "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)";
    setHovered(false);
  }, []);

  return (
    <div
      ref={ref}
      className={`rounded-xl ${className}`}
      style={{
        background: "rgba(10, 12, 25, 0.82)",
        backdropFilter: "blur(24px) saturate(1.5)",
        WebkitBackdropFilter: "blur(24px) saturate(1.5)",
        border: hovered
          ? `1px solid rgba(201,168,76,0.2)`
          : `1px solid rgba(255, 255, 255, 0.07)`,
        borderTop: `2px solid ${accentColor ?? "rgba(201, 168, 76, 0.45)"}`,
        boxShadow:
          "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        // Noise texture overlay via pseudo-element simulation with background-image
        backgroundImage: NOISE_SVG,
        backgroundBlendMode: "overlay",
        willChange: "transform, box-shadow",
        opacity: visible ? 1 : 0,
        transform: visible
          ? "perspective(900px) rotateY(0deg) rotateX(0deg) translateY(0)"
          : "perspective(900px) rotateX(8deg) translateY(24px)",
        transition: "opacity 0.65s ease-out, transform 0.65s ease-out, border-color 0.25s ease-out",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   STAT CARD — with animated counter + pulse glow
   ────────────────────────────────────────────────────────────── */

function StatCard({
  stat,
  delay,
}: {
  stat: StatCardConfig;
  delay: number;
}): JSX.Element {
  const { display, pulsing } = useCountUp(stat.value);

  return (
    <GlassPanel accentColor={stat.accentColor} className="p-5 flex flex-col gap-3" delay={delay}>
      {/* Label + icon row */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {stat.label}
        </span>
        {stat.icon}
      </div>

      {/* Value row */}
      <div className="flex items-end gap-1.5">
        <span
          className="text-3xl"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums lining-nums",
            color: stat.accentColor,
            lineHeight: 1,
            animation: pulsing ? "counter-pulse 0.8s ease-in-out" : "none",
            // Use CSS custom property for pulse color
            ["--pulse-color" as string]: `${stat.accentColor}80`,
          }}
        >
          {stat.value > 0 ? display : "—"}
        </span>
        {stat.suffix && (
          <span
            className="mb-1"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "18px",
              color: stat.accentColor,
              opacity: 0.7,
            }}
          >
            {stat.suffix}
          </span>
        )}
      </div>
    </GlassPanel>
  );
}

/* ──────────────────────────────────────────────────────────────
   PIPELINE NODES — gold gradient connecting line + dots
   ────────────────────────────────────────────────────────────── */

function PipelineNodes({
  pipeline,
  totalPipeline,
}: {
  pipeline: PipelineStageData[];
  totalPipeline: number;
}): JSX.Element {
  return (
    <div className="relative flex items-center justify-between" style={{ padding: "8px 0" }}>
      {/* Gold gradient connecting line (behind nodes) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "16px",
          right: "16px",
          top: "50%",
          height: "2px",
          background:
            "linear-gradient(to right, rgba(201,168,76,0.6), rgba(201,168,76,0.15), rgba(201,168,76,0.05))",
          transform: "translateY(-50%)",
          borderRadius: "2px",
        }}
      />

      {pipeline.map((stage, i) => {
        const pct = totalPipeline > 0 ? Math.round((stage.count / totalPipeline) * 100) : 0;
        const isActive = stage.count > 0;
        return (
          <div
            key={stage.name}
            className="flex flex-col items-center gap-2"
            style={{ position: "relative", zIndex: 1, flex: "0 0 auto" }}
          >
            {/* Count above dot */}
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: isActive ? stage.color : "var(--text-muted)",
                opacity: isActive ? 1 : 0.35,
                textShadow: isActive ? `0 0 8px ${stage.color}` : "none",
                animation: isActive
                  ? `flow-dot 3s ease-in-out infinite ${i * 0.4}s`
                  : "none",
              }}
            >
              {stage.count}
            </span>

            {/* Stage dot */}
            <div
              aria-hidden="true"
              style={{
                width: isActive ? "12px" : "8px",
                height: isActive ? "12px" : "8px",
                borderRadius: "50%",
                background: isActive ? stage.color : "rgba(255,255,255,0.1)",
                boxShadow: isActive
                  ? `0 0 8px ${stage.color}, 0 0 16px ${stage.color}60`
                  : "none",
                border: isActive ? `2px solid ${stage.color}` : "1px solid rgba(255,255,255,0.15)",
                transition: "all 0.3s ease",
              }}
            />

            {/* Stage name below */}
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: isActive ? "var(--text-secondary)" : "var(--text-muted)",
                opacity: isActive ? 0.8 : 0.35,
                whiteSpace: "nowrap",
              }}
            >
              {stage.name}
            </span>

            {/* Percentage below name */}
            {isActive && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px",
                  color: stage.color,
                  opacity: 0.6,
                }}
              >
                {pct}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PIPELINE BAR — stacked fill bars + shimmer flow animation
   ────────────────────────────────────────────────────────────── */

function PipelineBar({
  pipeline,
  totalPipeline,
}: {
  pipeline: PipelineStageData[];
  totalPipeline: number;
}): JSX.Element {
  return (
    <div
      className="relative overflow-hidden rounded-full"
      style={{
        height: "6px",
        background: "rgba(255, 255, 255, 0.06)",
      }}
      role="img"
      aria-label={`Pipeline: ${totalPipeline} applications across ${pipeline.filter((s) => s.count > 0).length} stages`}
    >
      {/* Stacked colored bars */}
      <div className="flex h-full w-full">
        {pipeline.map((stage) =>
          stage.count > 0 ? (
            <AnimatedBar
              key={stage.name}
              width={(stage.count / totalPipeline) * 100}
              color={stage.color}
            />
          ) : null
        )}
      </div>

      {/* Shimmer flow — moves continuously left to right */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "25%",
          height: "100%",
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.25), transparent)",
          animation: "pipeline-shimmer 3s linear infinite",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   ANIMATED BAR — expands from 0 on mount
   ────────────────────────────────────────────────────────────── */

function AnimatedBar({ width, color }: { width: number; color: string }): JSX.Element {
  const [currentWidth, setCurrentWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setCurrentWidth(width), 300);
    return () => clearTimeout(timer);
  }, [width]);

  return (
    <div
      className="h-full transition-all duration-1000 ease-out"
      style={{
        width: `${currentWidth}%`,
        backgroundColor: color,
        boxShadow: `0 0 10px ${color}, 0 0 4px ${color}`,
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────
   ACTIVITY ROW — slide-in, timeline dot, hover accent
   ────────────────────────────────────────────────────────────── */

function ActivityRow({ item, index }: { item: ActivityItemData; index: number }): JSX.Element {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="listitem"
      className="flex items-start gap-3 p-3 rounded-lg relative overflow-hidden"
      style={{
        border: hovered ? "1px solid rgba(201, 168, 76, 0.2)" : "1px solid transparent",
        background: hovered ? "rgba(201, 168, 76, 0.04)" : "transparent",
        transform: hovered ? "translateX(4px)" : "translateX(0)",
        transition: "all 0.25s ease-out",
        animation: `slide-in-left 0.4s ease-out both`,
        animationDelay: `${index * 80}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Sliding gold accent line on hover */}
      <div
        className="absolute left-0 top-0 w-0.5"
        style={{
          height: hovered ? "100%" : "0%",
          background: "linear-gradient(to bottom, var(--gold), rgba(201, 168, 76, 0.3))",
          opacity: hovered ? 0.7 : 0,
          transition: "height 0.25s ease-out, opacity 0.25s ease-out",
        }}
        aria-hidden="true"
      />

      {/* Colored type dot */}
      <ActivityDot type={item.type} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
          {item.title}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {item.description}
        </p>
      </div>

      {/* Timestamp */}
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
  );
}

/* ──────────────────────────────────────────────────────────────
   QUICK ACTION CARD — rich glass card with icon, title, desc, phase badge
   ────────────────────────────────────────────────────────────── */

interface QuickActionProps {
  label: string;
  desc: string;
  phase: string;
  icon: JSX.Element;
  accentColor: string;
  glowColor: string;
  borderColor: string;
}

function QuickActionCard({
  action,
  index,
}: {
  action: QuickActionProps;
  index: number;
}): JSX.Element {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      disabled
      aria-label={`${action.label} — ${action.phase} — Coming soon`}
      aria-disabled="true"
      title="Coming soon"
      className="text-left cursor-not-allowed rounded-xl p-5 relative overflow-hidden"
      style={{
        background: hovered
          ? `rgba(10, 12, 25, 0.88)`
          : "rgba(10, 12, 25, 0.65)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: hovered
          ? `1px solid ${action.borderColor}`
          : "1px solid rgba(255, 255, 255, 0.07)",
        borderTop: `2px solid ${hovered ? action.accentColor : `${action.accentColor}66`}`,
        boxShadow: hovered
          ? `0 8px 32px rgba(0,0,0,0.4), inset 0 0 24px ${action.glowColor}`
          : "0 4px 20px rgba(0,0,0,0.3)",
        backgroundImage: NOISE_SVG,
        backgroundBlendMode: "overlay",
        opacity: hovered ? 0.95 : 0.65,
        transform: hovered ? "translateY(-3px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "all 0.25s ease-out",
        willChange: "transform, opacity, box-shadow",
        animation: `slide-in-left 0.4s ease-out ${index * 100}ms both`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon — top left, colored */}
      <div
        className="mb-3"
        aria-hidden="true"
        style={{
          color: action.accentColor,
          opacity: hovered ? 0.9 : 0.55,
          transition: "opacity 0.25s ease",
        }}
      >
        {action.icon}
      </div>

      {/* Phase badge */}
      <div
        style={{
          display: "inline-block",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: action.accentColor,
          background: `${action.accentColor}18`,
          border: `1px solid ${action.accentColor}40`,
          borderRadius: "4px",
          padding: "2px 6px",
          marginBottom: "8px",
        }}
      >
        {action.phase}
      </div>

      {/* Label */}
      <div
        className="text-sm font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {action.label}
      </div>

      {/* Description */}
      <div
        className="text-xs mt-1.5 leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        {action.desc}
      </div>

      {/* Hover glow spot */}
      {hovered && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "-20px",
            right: "-20px",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: action.glowColor,
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />
      )}
    </button>
  );
}

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
      {/* Core dot */}
      <span
        className="rounded-full"
        style={{
          width: "6px",
          height: "6px",
          background: "var(--gold)",
          boxShadow: "0 0 8px rgba(201, 168, 76, 0.7)",
          display: "block",
          position: "relative",
          zIndex: 1,
        }}
      />
      {/* Ring 1 */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: "1px solid rgba(201, 168, 76, 0.45)",
          animation: "pulse-ring-ph 2.5s ease-out infinite",
        }}
      />
      {/* Ring 2 — delayed */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: "1px solid rgba(201, 168, 76, 0.3)",
          animation: "pulse-ring-ph 2.5s ease-out infinite 1.25s",
        }}
      />
    </span>
  );
}
