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
    { label: "Applied", key: "applied", count: stats.applied + stats.screening + stats.interviewing + stats.offers, color: "rgba(60, 160, 240, 0.8)" },
    { label: "Screening", key: "screening", count: stats.screening + stats.interviewing + stats.offers, color: "rgba(80, 180, 255, 0.8)" },
    { label: "Interview", key: "interview", count: stats.interviewing, color: "rgba(245, 158, 11, 0.8)" },
    { label: "Offer", key: "offer", count: stats.offers, color: "rgba(0, 255, 135, 0.8)" },
  ];
}

export function ConversionFunnel({ stats }: ConversionFunnelProps): JSX.Element {
  const stages = getFunnelStages(stats);
  const maxCount = Math.max(stages[0]?.count ?? 1, 1);

  return (
    <div
      role="img"
      aria-label="Conversion funnel showing application pipeline stages"
      style={{ display: "grid", gap: "8px", width: "100%" }}
    >
      {stages.map((stage, i) => {
        const width = Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 8 : 3);
        const nextStage = stages[i + 1];
        const convRate = nextStage && stage.count > 0
          ? Math.round((nextStage.count / stage.count) * 100)
          : null;

        return (
          <div key={stage.key} style={{ display: "grid", gap: "3px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "9px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(168, 216, 255, 0.9)", letterSpacing: "0.05em" }}>
                {stage.label.toUpperCase()}
              </span>
              <span style={{ fontSize: "11px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(100, 180, 255, 0.95)", fontWeight: 700 }}>
                {stage.count}
              </span>
            </div>
            <div style={{ height: "28px", display: "grid", placeItems: "center" }}>
              <div
                aria-hidden="true"
                style={{
                  width: `${width}%`,
                  height: "100%",
                  borderRadius: "3px",
                  background: stage.color,
                  transition: "width 0.6s ease-out",
                }}
              />
            </div>
            {convRate !== null && (
              <span style={{ justifySelf: "center", fontSize: "8px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(60, 140, 220, 0.6)" }}>
                {convRate}%
              </span>
            )}
          </div>
        );
      })}

      <p className="sr-only">
        Pipeline funnel: {stages.map((s) => `${s.label}: ${s.count}`).join(", ")}
      </p>
    </div>
  );
}
