"use client";
import { useState, useEffect, useRef, useCallback, type JSX } from "react";
import { EntranceSequence } from "@/components/transitions/EntranceSequence";
import type { PenthouseStats, PipelineStageData, ActivityItemData } from "./penthouse-data";

/* ──────────────────────────────────────────────────────────────
   TINY SVG ICON COMPONENTS (16×16)
   ────────────────────────────────────────────────────────────── */

/** Bar-chart icon: 3 vertical gold bars of varying height */
function IconBarChart() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect x="1" y="9" width="3.5" height="6" rx="0.5" fill="var(--gold)" opacity="0.55" />
      <rect x="6.25" y="5" width="3.5" height="10" rx="0.5" fill="var(--gold)" opacity="0.75" />
      <rect x="11.5" y="2" width="3.5" height="13" rx="0.5" fill="var(--gold)" opacity="1" />
    </svg>
  );
}

/** Flow icon: 3 connected gold dots in a pipeline shape */
function IconFlow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx="2.5" cy="8" r="2" fill="var(--info)" opacity="0.9" />
      <line x1="4.5" y1="8" x2="6.5" y2="8" stroke="var(--info)" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="8" cy="8" r="2" fill="var(--info)" opacity="0.9" />
      <line x1="10" y1="8" x2="12" y2="8" stroke="var(--info)" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="13.5" cy="8" r="2" fill="var(--info)" opacity="0.9" />
    </svg>
  );
}

/** Bullseye icon: 2 concentric circles */
function IconBullseye() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="6.5" stroke="var(--success)" strokeWidth="1.2" opacity="0.55" />
      <circle cx="8" cy="8" r="3.5" stroke="var(--success)" strokeWidth="1.4" opacity="0.85" />
      <circle cx="8" cy="8" r="1.5" fill="var(--success)" opacity="1" />
    </svg>
  );
}

/** Trend-line icon: a rising gold line with a dot at the end */
function IconTrendLine() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <polyline
        points="1,12 5,9 9,5.5 13,3"
        stroke="var(--warning)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx="13" cy="3" r="2" fill="var(--warning)" opacity="1" />
    </svg>
  );
}

/** Activity type dot indicator */
function ActivityDot({ type }: { type: ActivityItemData["type"] }) {
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
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────
   STAT CARD CONFIG (type safe, no emoji)
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

/**
 * PenthouseClient — The hero dashboard with immersive glass-panel UI.
 *
 * Features:
 * - 3D perspective tilt on glass panels (mouse-reactive)
 * - Animated number counters that count up from zero
 * - Staggered entrance with cascade delay
 * - Gold edge glow on panels
 * - Parallax on header text
 * - Pulse ring on active floor indicator
 * - Interactive activity feed with sliding gold accent
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
  const headerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Good morning");
    else if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else if (hour >= 17 && hour < 21) setGreeting("Good evening");
    else setGreeting("Burning the midnight oil");
  }, []);

  // Track mouse for parallax on header
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
      if (headerRef.current) {
        const px = (mouseRef.current.x - 0.5) * 8;
        const py = (mouseRef.current.y - 0.5) * 4;
        headerRef.current.style.transform = `translate(${px}px, ${py}px)`;
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

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
      <div
        className="flex min-h-dvh flex-col p-6 md:p-10 gap-8 max-w-5xl mx-auto"
        aria-label="Penthouse dashboard"
      >

        {/* ── HEADER with parallax ── */}
        <header
          ref={headerRef}
          className="space-y-3 pt-2 transition-transform duration-100 ease-out"
          aria-label="Penthouse dashboard header"
        >
          {/* Floor label */}
          <div
            className="flex items-center gap-2.5"
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

          {/* Main greeting */}
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
                textShadow: "0 0 28px rgba(201, 168, 76, 0.4), 0 0 60px rgba(201, 168, 76, 0.15)",
              }}
            >
              {displayName}
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-base"
            style={{
              color: "var(--text-secondary)",
              textShadow: "0 1px 10px rgba(0, 0, 0, 0.8)",
            }}
          >
            Your command center overview
          </p>
        </header>

        {/* ── STAT CARDS — 2×2 on mobile, 4-col on lg ── */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          role="group"
          aria-label="Dashboard statistics"
        >
          {statCards.map((stat, i) => (
            <TiltGlassPanel
              key={stat.label}
              accentColor={stat.accentColor}
              className="p-5 flex flex-col gap-3"
              delay={i * 120}
            >
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
                <AnimatedCounter value={stat.value} accentColor={stat.accentColor} />
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
            </TiltGlassPanel>
          ))}
        </div>

        {/* ── PIPELINE VISUALIZATION ── */}
        <TiltGlassPanel className="p-7 space-y-5" delay={500}>
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
              <span className="text-3xl opacity-40" aria-hidden="true">🏗️</span>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No applications yet. Head to the War Room to start building your pipeline.
              </p>
            </div>
          ) : (
            <>
              {/* Progress bar — 4px, glowing segments */}
              <div
                className="flex rounded-full overflow-hidden"
                style={{
                  height: "4px",
                  background: "rgba(255, 255, 255, 0.06)",
                }}
                role="img"
                aria-label={`Pipeline: ${totalPipeline} applications across ${pipeline.filter((s) => s.count > 0).length} stages`}
              >
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
        </TiltGlassPanel>

        {/* ── RECENT ACTIVITY ── */}
        <TiltGlassPanel className="p-7 space-y-4" delay={650}>
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
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="text-3xl opacity-40" aria-hidden="true">📭</span>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No activity yet. Your timeline will populate as you use The Tower.
              </p>
            </div>
          ) : (
            <div className="space-y-1" role="list" aria-label="Recent activity list">
              {activity.map((item, i) => (
                <ActivityRow key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </TiltGlassPanel>

        {/* ── QUICK ACTIONS — 3-col grid ── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          role="group"
          aria-label="Quick actions — coming soon"
        >
          {[
            {
              label: "Add Application",
              desc: "Track a new opportunity",
              floor: "7",
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <line x1="8" y1="2" x2="8" y2="14" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" />
                  <line x1="2" y1="8" x2="14" y2="8" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              label: "Research Company",
              desc: "Get intelligence on a target",
              floor: "6",
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.5" stroke="var(--gold)" strokeWidth="1.5" />
                  <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              label: "Prep Interview",
              desc: "Generate a briefing packet",
              floor: "3",
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="var(--gold)" strokeWidth="1.4" />
                  <line x1="5" y1="5.5" x2="11" y2="5.5" stroke="var(--gold)" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
                  <line x1="5" y1="8" x2="11" y2="8" stroke="var(--gold)" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
                  <line x1="5" y1="10.5" x2="8.5" y2="10.5" stroke="var(--gold)" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
                </svg>
              ),
            },
          ].map((action, i) => (
            <QuickActionCard key={action.label} action={action} index={i} />
          ))}
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
   SUBCOMPONENTS
   ────────────────────────────────────────────────────────────── */

/**
 * TiltGlassPanel — 3D perspective tilt on hover + gold edge glow.
 * Staggered entrance via delay prop.
 */
function TiltGlassPanel({
  children,
  className = "",
  accentColor,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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
    el.style.transform = `perspective(900px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) scale(1.01)`;
    el.style.boxShadow = `
      0 20px 60px rgba(0, 0, 0, 0.55),
      0 0 1px rgba(255, 255, 255, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
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
  }, []);

  return (
    <div
      ref={ref}
      className={`rounded-xl ${className}`}
      style={{
        background: "rgba(10, 12, 25, 0.82)",
        backdropFilter: "blur(24px) saturate(1.5)",
        WebkitBackdropFilter: "blur(24px) saturate(1.5)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        borderTop: `2px solid ${accentColor ?? "rgba(201, 168, 76, 0.45)"}`,
        boxShadow:
          "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        willChange: "transform, box-shadow",
        opacity: visible ? 1 : 0,
        transform: visible
          ? "perspective(900px) rotateY(0deg) rotateX(0deg) translateY(0)"
          : "perspective(900px) rotateX(8deg) translateY(24px)",
        transition: "opacity 0.65s ease-out, transform 0.65s ease-out",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

/**
 * AnimatedCounter — counts from 0 to target on mount with ease-out cubic.
 */
function AnimatedCounter({ value, accentColor }: { value: number; accentColor: string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    startRef.current = performance.now();
    const duration = 1200 + Math.random() * 400;

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <span
      className="text-3xl"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontVariantNumeric: "tabular-nums lining-nums",
        color: accentColor,
        textShadow: `0 0 18px color-mix(in srgb, ${accentColor} 35%, transparent)`,
        lineHeight: 1,
      }}
    >
      {value > 0 ? display : "—"}
    </span>
  );
}

/**
 * AnimatedBar — pipeline bar segment that expands from 0 on mount.
 */
function AnimatedBar({ width, color }: { width: number; color: string }) {
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

/**
 * ActivityRow — hover-interactive activity item with sliding gold accent line.
 */
function ActivityRow({ item, index }: { item: ActivityItemData; index: number }) {
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
        animationDelay: `${index * 80}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Sliding gold accent line */}
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

/**
 * QuickActionCard — disabled placeholder, muted glass with LOCKED badge.
 */
function QuickActionCard({
  action,
  index: _index,
}: {
  action: { label: string; desc: string; floor: string; icon: JSX.Element };
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      disabled
      aria-label={`${action.label} — Floor ${action.floor} — Locked`}
      aria-disabled="true"
      title="Coming soon — complete Phase 1+"
      className="text-left cursor-default rounded-xl p-5 relative overflow-hidden"
      style={{
        background: hovered ? "rgba(10, 12, 25, 0.72)" : "rgba(10, 12, 25, 0.55)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: hovered
          ? "1px solid rgba(201, 168, 76, 0.15)"
          : "1px solid rgba(255, 255, 255, 0.05)",
        borderTop: "2px solid rgba(201, 168, 76, 0.2)",
        opacity: hovered ? 0.6 : 0.4,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.25s ease-out",
        willChange: "transform, opacity",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* SVG icon — top right */}
      <div
        className="absolute top-4 right-4"
        aria-hidden="true"
        style={{ opacity: 0.35 }}
      >
        {action.icon}
      </div>

      {/* Label */}
      <div
        className="text-sm font-medium pr-6"
        style={{ color: "var(--text-primary)" }}
      >
        {action.label}
      </div>

      {/* Description */}
      <div
        className="text-xs mt-1.5"
        style={{ color: "var(--text-muted)" }}
      >
        {action.desc}
      </div>

      {/* Floor number */}
      <div
        className="mt-3"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "10px",
          color: "var(--gold)",
          opacity: 0.55,
          letterSpacing: "0.12em",
        }}
      >
        FLOOR {action.floor}
      </div>

      {/* LOCKED badge — bottom right */}
      <div
        className="absolute bottom-4 right-4"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "8px",
          letterSpacing: "0.2em",
          color: "var(--text-muted)",
          opacity: 0.45,
        }}
      >
        LOCKED
      </div>
    </button>
  );
}

/**
 * PulseRing — animated radar-like pulse emanating from a gold dot.
 */
function PulseRing() {
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
      <style>{`
        @keyframes pulse-ring-ph {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.6); opacity: 0;   }
        }
      `}</style>
    </span>
  );
}
