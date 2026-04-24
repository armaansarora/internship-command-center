import type { JSX } from "react";
import type { SimulateTurnScoring } from "@/lib/ai/structured/simulator-turn";

interface Props {
  round: number;
  scoring: SimulateTurnScoring;
}

const AXES = [
  { key: "anchorScore" as const, short: "A", long: "anchor" },
  { key: "concessionScore" as const, short: "C", long: "concession" },
  { key: "walkawayScore" as const, short: "W", long: "walkaway" },
];

export function TurnScoreBadge({ round, scoring }: Props): JSX.Element {
  const ariaLabel =
    `Round ${round}: ` +
    AXES.map((a) => `${a.long} ${scoring[a.key]}/5`).join(", ") +
    `. ${scoring.critique}`;

  return (
    <div
      className="parlor-sim-score"
      data-testid="turn-score-badge"
      aria-label={ariaLabel}
    >
      <div className="parlor-sim-score-axes">
        {AXES.map((axis) => (
          <div key={axis.key} className="parlor-sim-score-axis">
            <span className="parlor-sim-score-axis-label" aria-hidden="true">
              {axis.short}
            </span>
            <span className="parlor-sim-score-dots" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  data-axis={axis.key}
                  data-filled={String(i < scoring[axis.key])}
                  className="parlor-sim-score-dot"
                />
              ))}
            </span>
          </div>
        ))}
      </div>
      <p className="parlor-sim-score-critique">{scoring.critique}</p>
    </div>
  );
}
