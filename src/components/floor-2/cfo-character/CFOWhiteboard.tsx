import type { JSX } from "react";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";

interface CFOWhiteboardProps {
  stats: PipelineStats;
}

// ---------------------------------------------------------------------------
// Mini conversion funnel bar
// ---------------------------------------------------------------------------
function MiniFunnelBar({ stats }: { stats: PipelineStats }): JSX.Element {
  const stages = [
    { key: "app", label: "APP", count: stats.applied,       color: "rgba(60, 140, 220, 0.9)"  },
    { key: "scr", label: "SCR", count: stats.screening,     color: "rgba(80, 160, 240, 0.9)"  },
    { key: "int", label: "INT", count: stats.interviewing,  color: "rgba(245, 158, 11, 0.9)"  },
    { key: "ofr", label: "OFR", count: stats.offers,        color: "rgba(0, 255, 135, 0.9)"   },
  ];
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div
      role="img"
      aria-label="Mini conversion funnel"
      style={{ width: "100%" }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "36px" }}>
        {stages.map((stage) => {
          const h = Math.max((stage.count / maxCount) * 100 * 0.36, stage.count > 0 ? 4 : 2);
          return (
            <div
              key={stage.key}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: "2px" }}
            >
              <span
                aria-hidden="true"
                style={{ fontSize: "8px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: stage.color }}
              >
                {stage.count}
              </span>
              <div
                style={{
                  width: "100%",
                  height: `${h}px`,
                  borderRadius: "2px",
                  background: stage.color,
                  opacity: stage.count > 0 ? 0.85 : 0.2,
                  transition: "height 0.5s ease-out",
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
        {stages.map((stage) => (
          <div key={stage.key} style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontSize: "7px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(74, 122, 155, 0.8)" }}>
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini trend sparkline (SVG)
// ---------------------------------------------------------------------------
function MiniTrend({ convRate }: { convRate: number }): JSX.Element {
  // Simulated 6-week trend based on current conversion rate
  const base = Math.max(convRate - 5, 0);
  const trendData = [base * 0.6, base * 0.75, base * 0.8, base * 0.9, convRate * 0.95, convRate];
  const max = Math.max(...trendData, 1);

  const w = 100;
  const h = 28;
  const pad = 4;
  const points = trendData.map((v, i) => ({
    x: pad + (i / (trendData.length - 1)) * (w - pad * 2),
    y: h - pad - ((v / max) * (h - pad * 2)),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d={pathD} fill="none" stroke="rgba(60, 140, 220, 0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill="rgba(60, 140, 220, 0.9)" />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Metric pill
// ---------------------------------------------------------------------------
function MetricPill({ label, value, color }: { label: string; value: string; color: string }): JSX.Element {
  return (
    <div
      role="group"
      aria-label={`${label}: ${value}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1px",
      }}
    >
      <span style={{ fontSize: "8px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(74, 122, 155, 0.8)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: "18px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color, fontWeight: 700, lineHeight: 1 }} aria-hidden="true">
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CFOWhiteboard({ stats }: CFOWhiteboardProps): JSX.Element {
  // R9.9 — Discreet entry point for the State of the Month PDF (R9.8 route).
  // Computed from current local time so the link always points at the active
  // month; format is YYYY-MM per the route's Zod validator.
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div
      role="region"
      aria-label="CFO analytics whiteboard"
      style={{
        position: "relative",
        borderRadius: "6px",
        padding: "14px",
        width: "100%",
        background: "rgba(8, 18, 32, 0.9)",
        border: "1px solid rgba(60, 140, 220, 0.2)",
        boxShadow: "inset 0 0 24px rgba(60, 140, 220, 0.04)",
        fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
      }}
    >
      {/* Board header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "9px", color: "rgba(127, 179, 211, 0.9)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          ANALYTICS // LIVE
        </span>
        <span style={{ fontSize: "10px", color: "rgba(60, 140, 220, 0.9)", fontWeight: 700 }} aria-label={`${stats.total} total active`}>
          {stats.total} ACTIVE
        </span>
      </div>

      {/* Mini funnel */}
      <div style={{ marginBottom: "10px" }}>
        <MiniFunnelBar stats={stats} />
      </div>

      {/* Key metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
        <MetricPill
          label="CONV"
          value={`${stats.conversionRate.toFixed(0)}%`}
          color={stats.conversionRate >= 10 ? "rgba(0, 255, 135, 0.9)" : "rgba(245, 158, 11, 0.9)"}
        />
        <MetricPill
          label="STALE"
          value={stats.staleCount.toString()}
          color={stats.staleCount > 5 ? "rgba(220, 60, 60, 0.9)" : "rgba(245, 158, 11, 0.9)"}
        />
        <MetricPill
          label="WK ΔΔ"
          value={`+${stats.weeklyActivity}`}
          color="rgba(100, 180, 255, 0.9)"
        />
      </div>

      {/* Trend sparkline */}
      <div style={{ borderTop: "1px solid rgba(60, 140, 220, 0.12)", paddingTop: "8px" }}>
        <span style={{ fontSize: "8px", color: "rgba(74, 122, 155, 0.8)", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>
          CONV TREND
        </span>
        <MiniTrend convRate={stats.conversionRate} />
      </div>

      {/* R9.9 — Discreet download surface for the State of the Month PDF. */}
      <div
        style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(60, 140, 220, 0.1)",
          fontSize: "9px",
          fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
          color: "rgba(74, 122, 155, 0.65)",
          letterSpacing: "0.08em",
          textAlign: "center",
        }}
      >
        <a
          href={`/api/reports/state-of-month?month=${currentMonth}`}
          aria-label={`Download State of the Month PDF for ${currentMonth}`}
          style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "3px" }}
        >
          DOWNLOAD STATE OF THE MONTH ↓
        </a>
      </div>

      {/* Decorative label */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "6px",
          right: "8px",
          fontSize: "7px",
          color: "rgba(26, 58, 92, 0.8)",
          fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
          transform: "rotate(0.8deg)",
        }}
      >
        {"// CFO METRICS"}
      </div>
    </div>
  );
}


