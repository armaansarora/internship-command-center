import { useState, useEffect, type JSX } from "react";
import type { PipelineStageData } from "@/app/(authenticated)/penthouse/penthouse-data";

/* ──────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────── */

interface PipelineNodesProps {
  pipeline: PipelineStageData[];
  totalPipeline: number;
}

interface PipelineBarProps {
  pipeline: PipelineStageData[];
  totalPipeline: number;
}

interface AnimatedBarProps {
  width: number;
  color: string;
}

/* ──────────────────────────────────────────────────────────────
   ANIMATED BAR — expands from 0% width on mount
   ────────────────────────────────────────────────────────────── */

function AnimatedBar({ width, color }: AnimatedBarProps): JSX.Element {
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
   PIPELINE BAR — stacked fill bars + shimmer animation
   ────────────────────────────────────────────────────────────── */

export function PipelineBar({ pipeline, totalPipeline }: PipelineBarProps): JSX.Element {
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
      {/* Stacked coloured bars */}
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

      {/* Shimmer — moves continuously left to right */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "25%",
          height: "100%",
          background: "linear-gradient(to right, transparent, rgba(255,255,255,0.25), transparent)",
          animation: "pipeline-shimmer 3s linear infinite",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PIPELINE NODES — gold gradient connecting line + stage dots
   ────────────────────────────────────────────────────────────── */

/**
 * PipelineNodes renders:
 *  1. A gold gradient horizontal connecting line (decorative)
 *  2. Per-stage: count label → dot → stage name → percentage
 *
 * The component is purely presentational; no state, no effects.
 */
export function PipelineNodes({ pipeline, totalPipeline }: PipelineNodesProps): JSX.Element {
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
          /* rgba(201,168,76,…) = --gold */
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
                animation: isActive ? `flow-dot 3s ease-in-out infinite ${i * 0.4}s` : "none",
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
                border: isActive
                  ? `2px solid ${stage.color}`
                  : "1px solid rgba(255,255,255,0.15)",
                transition: "all 0.3s ease",
              }}
            />

            {/* Stage name below dot */}
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

            {/* Percentage below name — only shown when stage has items */}
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
