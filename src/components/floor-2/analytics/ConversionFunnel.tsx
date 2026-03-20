import type { JSX } from "react";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";

interface ConversionFunnelProps {
  stats: PipelineStats;
}

interface FunnelStage {
  label: string;
  key: string;
  count: number;
  color: string;
}

function getFunnelStages(stats: PipelineStats): FunnelStage[] {
  return [
    { label: "Discovered", key: "discovered", count: stats.discovered + stats.applied + stats.screening + stats.interviewing + stats.offers, color: "rgba(60, 140, 220, 0.8)" },
    { label: "Applied",    key: "applied",    count: stats.applied + stats.screening + stats.interviewing + stats.offers, color: "rgba(60, 160, 240, 0.8)" },
    { label: "Screening",  key: "screening",  count: stats.screening + stats.interviewing + stats.offers, color: "rgba(80, 180, 255, 0.8)" },
    { label: "Interview",  key: "interview",  count: stats.interviewing, color: "rgba(245, 158, 11, 0.8)" },
    { label: "Offer",      key: "offer",      count: stats.offers, color: "rgba(0, 255, 135, 0.8)" },
  ];
}

/**
 * ConversionFunnel — SVG funnel visualization showing pipeline stages.
 * Pure SVG + CSS, no external chart library.
 */
export function ConversionFunnel({ stats }: ConversionFunnelProps): JSX.Element {
  const stages = getFunnelStages(stats);
  const maxCount = Math.max(stages[0]?.count ?? 1, 1);

  const svgWidth = 280;
  const svgHeight = 200;
  const barHeight = 28;
  const barGap = 8;
  const labelX = 8;
  const countX = svgWidth - 8;

  return (
    <div
      role="img"
      aria-label="Conversion funnel showing application pipeline stages"
    >
      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {stages.map((stage, i) => {
          const pct = stage.count / maxCount;
          const barWidth = Math.max(pct * svgWidth * 0.92, stage.count > 0 ? 12 : 4);
          const y = i * (barHeight + barGap);
          const centerX = svgWidth / 2;
          const x = centerX - barWidth / 2;

          // Conversion rate between this and next
          const nextStage = stages[i + 1];
          const convRate = nextStage && stage.count > 0
            ? Math.round((nextStage.count / stage.count) * 100)
            : null;

          return (
            <g key={stage.key}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="3"
                fill={stage.color}
                style={{ transition: "width 0.6s ease-out, x 0.6s ease-out" }}
              />

              {/* Stage label */}
              <text
                x={labelX}
                y={y + barHeight / 2 + 4}
                fill="rgba(168, 216, 255, 0.9)"
                fontSize="9"
                fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
                letterSpacing="0.05em"
              >
                {stage.label.toUpperCase()}
              </text>

              {/* Count */}
              <text
                x={countX}
                y={y + barHeight / 2 + 4}
                fill="rgba(100, 180, 255, 0.95)"
                fontSize="11"
                fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
                fontWeight="700"
                textAnchor="end"
              >
                {stage.count}
              </text>

              {/* Conversion arrow between stages */}
              {convRate !== null && (
                <>
                  <line
                    x1={centerX}
                    y1={y + barHeight + 1}
                    x2={centerX}
                    y2={y + barHeight + barGap - 1}
                    stroke="rgba(60, 140, 220, 0.35)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={centerX + 6}
                    y={y + barHeight + barGap / 2 + 3}
                    fill="rgba(60, 140, 220, 0.6)"
                    fontSize="8"
                    fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
                  >
                    {convRate}%
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Screen-reader text */}
      <p className="sr-only">
        Pipeline funnel: {stages.map((s) => `${s.label}: ${s.count}`).join(", ")}
      </p>
    </div>
  );
}
