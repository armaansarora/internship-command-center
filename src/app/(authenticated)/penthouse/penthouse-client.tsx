"use client";

import { useState, useEffect, useRef, useCallback, type JSX } from "react";
import { EntranceSequence } from "@/components/transitions/EntranceSequence";
import type {
  PenthouseStats,
  PipelineStageData,
  ActivityItemData,
} from "./penthouse-data";

/** Stat card display config */
interface StatCardConfig {
  label: string;
  value: number;
  suffix: string;
  icon: string;
  accentColor: string;
}

/**
 * PenthouseClient — The hero dashboard with immersive glass-panel UI.
 *
 * Game-like features:
 * - 3D perspective tilt on glass panels (mouse-reactive)
 * - Animated number counters that count up from zero
 * - Staggered entrance with cascade delay
 * - Hover glow halos on panels
 * - Parallax on header text
 * - Pulse ring on active metrics
 * - Interactive activity feed with sliding reveals
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

  // Track mouse for parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
      // Apply parallax to header
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
      icon: "📋",
      accentColor: "var(--gold)",
    },
    {
      label: "In Pipeline",
      value: stats.inPipeline,
      suffix: "",
      icon: "🔄",
      accentColor: "var(--info)",
    },
    {
      label: "Interviews",
      value: stats.interviews,
      suffix: "",
      icon: "🎯",
      accentColor: "var(--success)",
    },
    {
      label: "Response Rate",
      value: stats.totalApplications > 0 ? stats.responseRate : 0,
      suffix: "%",
      icon: "📊",
      accentColor: "var(--warning)",
    },
  ];

  return (
    <EntranceSequence>
      <div className="flex min-h-dvh flex-col p-6 md:p-10 gap-6 max-w-5xl mx-auto">
        {/* ── HEADER with parallax ── */}
        <header ref={headerRef} className="space-y-2 pt-2 transition-transform duration-100 ease-out" aria-label="Penthouse dashboard header">
          <div
            className="flex items-center gap-3 mb-3"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.3em",
              color: "var(--gold)",
              opacity: 0.5,
            }}
          >
            <PulseRing />
            FLOOR PH — THE PENTHOUSE
          </div>
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
            Your command center overview
          </p>
        </header>

        {/* ── STAT CARDS with animated counters + tilt ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="group" aria-label="Dashboard statistics">
          {statCards.map((stat, i) => (
            <TiltGlassPanel
              key={stat.label}
              accentColor={stat.accentColor}
              className="p-5 flex flex-col gap-3"
              delay={i * 120}
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
              <div className="flex items-end gap-1">
                <AnimatedCounter
                  value={stat.value}
                  accentColor={stat.accentColor}
                />
                {stat.suffix && (
                  <span
                    className="text-lg mb-0.5"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
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
        <TiltGlassPanel className="p-6 space-y-4" delay={500}>
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
                    <AnimatedBar
                      key={stage.name}
                      width={(stage.count / totalPipeline) * 100}
                      color={stage.color}
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
        </TiltGlassPanel>

        {/* ── RECENT ACTIVITY ── */}
        <TiltGlassPanel className="p-6 space-y-4" delay={650}>
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
            <div className="space-y-1">
              {activity.map((item, i) => (
                <ActivityRow key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </TiltGlassPanel>

        {/* ── QUICK ACTIONS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Add Application", desc: "Track a new opportunity", floor: "7", icon: "➕" },
            { label: "Research Company", desc: "Get intelligence on a target", floor: "6", icon: "🔍" },
            { label: "Prep Interview", desc: "Generate a briefing packet", floor: "3", icon: "📄" },
          ].map((action, i) => (
            <QuickActionCard key={action.label} action={action} index={i} />
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

/* ──────────────────────────────────────────────────────────────
   INTERACTIVE COMPONENTS
   ────────────────────────────────────────────────────────────── */

/**
 * TiltGlassPanel — 3D perspective tilt on hover + gold edge glow.
 * Tracks mouse position relative to the panel and applies CSS 3D transform.
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
    el.style.transform = `perspective(800px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) scale(1.01)`;
    // Glow follows mouse
    el.style.boxShadow = `
      0 16px 48px rgba(0, 0, 0, 0.45),
      0 0 1px rgba(255, 255, 255, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      ${x * 30}px ${y * 30}px 60px rgba(201, 168, 76, 0.06)
    `;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)";
    el.style.boxShadow = "0 16px 48px rgba(0, 0, 0, 0.45), 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)";
  }, []);

  return (
    <div
      ref={ref}
      className={`rounded-xl transition-all duration-300 ease-out ${className}`}
      style={{
        background: "rgba(10, 12, 25, 0.78)",
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        borderTop: `2px solid ${accentColor ?? "rgba(201, 168, 76, 0.4)"}`,
        boxShadow:
          "0 16px 48px rgba(0, 0, 0, 0.45), 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        willChange: "transform, box-shadow",
        opacity: visible ? 1 : 0,
        transform: visible ? "perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0)" : "perspective(800px) rotateX(8deg) translateY(20px)",
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

/**
 * AnimatedCounter — counts from 0 to target value on mount.
 */
function AnimatedCounter({ value, accentColor }: { value: number; accentColor: string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    startRef.current = performance.now();
    const duration = 1200 + Math.random() * 400; // Varied timing for organic feel

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
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
      className="text-2xl"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontVariantNumeric: "tabular-nums lining-nums",
        color: accentColor,
        textShadow: `0 0 15px color-mix(in srgb, ${accentColor} 30%, transparent)`,
      }}
    >
      {value > 0 ? display : "—"}
    </span>
  );
}

/**
 * AnimatedBar — pipeline bar that expands from 0 on mount.
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
        boxShadow: `0 0 8px ${color}`,
      }}
    />
  );
}

/**
 * ActivityRow — hover-interactive activity item with sliding gold line.
 */
function ActivityRow({ item, index }: { item: ActivityItemData; index: number }) {
  const [hovered, setHovered] = useState(false);

  const icons: Record<ActivityItemData["type"], string> = {
    application: "📋",
    email: "📧",
    interview: "🎯",
    follow_up: "↩️",
  };

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg transition-all duration-300 relative overflow-hidden"
      style={{
        border: hovered ? "1px solid rgba(201, 168, 76, 0.2)" : "1px solid transparent",
        background: hovered ? "rgba(201, 168, 76, 0.04)" : "transparent",
        transform: hovered ? "translateX(4px)" : "translateX(0)",
        animationDelay: `${index * 80}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Sliding gold accent line */}
      <div
        className="absolute left-0 top-0 w-0.5 transition-all duration-300"
        style={{
          height: hovered ? "100%" : "0%",
          background: "var(--gold)",
          opacity: hovered ? 0.6 : 0,
        }}
      />
      <span className="text-sm shrink-0 mt-0.5">{icons[item.type]}</span>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {item.title}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
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
  );
}

/**
 * QuickActionCard — disabled but visually interactive placeholder.
 */
function QuickActionCard({ action, index }: {
  action: { label: string; desc: string; floor: string; icon: string };
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      disabled
      title="Coming soon — complete Phase 1+"
      className="text-left group cursor-default rounded-xl p-4 transition-all duration-300 relative overflow-hidden"
      style={{
        background: hovered ? "rgba(10, 12, 25, 0.7)" : "rgba(10, 12, 25, 0.55)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: hovered ? "1px solid rgba(201, 168, 76, 0.15)" : "1px solid rgba(255, 255, 255, 0.05)",
        opacity: hovered ? 0.7 : 0.5,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Corner icon */}
      <div className="absolute top-3 right-3 text-lg opacity-20">{action.icon}</div>
      <div className="text-sm" style={{ color: "var(--text-primary)" }}>
        {action.label}
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
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
      {/* Lock indicator */}
      <div
        className="absolute bottom-3 right-3"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "8px",
          letterSpacing: "0.2em",
          color: "var(--text-muted)",
          opacity: 0.4,
        }}
      >
        LOCKED
      </div>
    </button>
  );
}

/**
 * PulseRing — animated radar-like pulse emanating from a dot.
 */
function PulseRing() {
  return (
    <span className="relative inline-flex items-center justify-center w-3 h-3" aria-hidden="true">
      {/* Core dot */}
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: "var(--gold)",
          boxShadow: "0 0 6px rgba(201, 168, 76, 0.6)",
        }}
      />
      {/* Ring 1 */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: "1px solid rgba(201, 168, 76, 0.4)",
          animation: "pulse-ring 2.5s ease-out infinite",
        }}
      />
      {/* Ring 2 (delayed) */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: "1px solid rgba(201, 168, 76, 0.3)",
          animation: "pulse-ring 2.5s ease-out infinite 1.2s",
        }}
      />
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </span>
  );
}
