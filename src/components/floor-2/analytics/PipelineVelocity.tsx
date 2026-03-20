import type { JSX } from "react";

interface VelocityStage {
  label: string;
  days: number;
  target: number; // target days — below = green, up to 2x = yellow, above = red
}

interface PipelineVelocityProps {
  /** Average days per stage — pass actual data or defaults */
  stages?: VelocityStage[];
}

const DEFAULT_STAGES: VelocityStage[] = [
  { label: "Discovered → Applied",   days: 3,  target: 5  },
  { label: "Applied → Screening",    days: 8,  target: 7  },
  { label: "Screening → Interview",  days: 10, target: 10 },
  { label: "Interview → Decision",   days: 14, target: 14 },
];

function velocityColor(days: number, target: number): string {
  if (days <= target)          return "rgba(0, 255, 135, 0.85)";  // green = fast
  if (days <= target * 1.75)   return "rgba(245, 158, 11, 0.85)"; // yellow = medium
  return "rgba(220, 60, 60, 0.85)";                                // red = slow
}

function velocityLabel(days: number, target: number): string {
  if (days <= target)          return "FAST";
  if (days <= target * 1.75)   return "OK";
  return "SLOW";
}

/**
 * PipelineVelocity — bar chart showing average days per pipeline stage.
 * Color-coded by speed. Pure CSS + SVG.
 */
export function PipelineVelocity({ stages = DEFAULT_STAGES }: PipelineVelocityProps): JSX.Element {
  const maxDays = Math.max(...stages.map((s) => s.days), 1);

  return (
    <div
      role="img"
      aria-label="Pipeline velocity chart showing average days per stage"
      style={{ width: "100%" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "100%",
        }}
      >
        {stages.map((stage) => {
          const pct = (stage.days / maxDays) * 100;
          const color = velocityColor(stage.days, stage.target);
          const speedLabel = velocityLabel(stage.days, stage.target);

          return (
            <div key={stage.label} role="group" aria-label={`${stage.label}: ${stage.days} days (${speedLabel})`}>
              {/* Label row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
                    color: "rgba(168, 216, 255, 0.8)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {stage.label}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "8px",
                      fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
                      color,
                      letterSpacing: "0.08em",
                      fontWeight: 700,
                    }}
                  >
                    {speedLabel}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
                      color,
                      fontWeight: 700,
                    }}
                    aria-hidden="true"
                  >
                    {stage.days}d
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div
                style={{
                  width: "100%",
                  height: "6px",
                  borderRadius: "3px",
                  background: "rgba(60, 140, 220, 0.1)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* Target line */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${(stage.target / maxDays) * 100}%`,
                    width: "1px",
                    background: "rgba(60, 140, 220, 0.4)",
                    zIndex: 1,
                  }}
                />
                {/* Velocity bar */}
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    borderRadius: "3px",
                    background: color,
                    boxShadow: `0 0 8px ${color}`,
                    transition: "width 0.6s ease-out",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginTop: "12px",
          borderTop: "1px solid rgba(60, 140, 220, 0.12)",
          paddingTop: "8px",
        }}
        aria-hidden="true"
      >
        {[
          { label: "FAST", color: "rgba(0, 255, 135, 0.85)" },
          { label: "OK", color: "rgba(245, 158, 11, 0.85)" },
          { label: "SLOW", color: "rgba(220, 60, 60, 0.85)" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: item.color,
              }}
            />
            <span
              style={{
                fontSize: "9px",
                fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
                color: "rgba(74, 122, 155, 0.9)",
                letterSpacing: "0.06em",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px" }}>
          <div
            style={{
              width: "1px",
              height: "10px",
              background: "rgba(60, 140, 220, 0.5)",
            }}
          />
          <span
            style={{
              fontSize: "9px",
              fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
              color: "rgba(74, 122, 155, 0.9)",
            }}
          >
            TARGET
          </span>
        </div>
      </div>

      <p className="sr-only">
        {stages.map((s) => `${s.label}: ${s.days} days`).join(", ")}
      </p>
    </div>
  );
}
