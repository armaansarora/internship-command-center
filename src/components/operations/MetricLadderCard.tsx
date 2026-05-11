import type { JSX } from "react";
import type { FunnelMetricReading } from "@/lib/analytics/funnel-rollup";

/**
 * Metric Ladder — vertical table of the six activation metrics defined in
 * `ACTIVATION_METRIC_TARGETS`. One row per metric, columns:
 *   - description (human-readable label)
 *   - target  (formatted by unit: ratio → percent, usd → "$0.05")
 *   - kill threshold (same formatting)
 *   - observed value ("—" when null)
 *   - health-colored chip ("On target" / "Below target" / "Kill")
 *
 * Health colors per spec:
 *   above_target = gold   #C9A84C
 *   below_target = amber  #FFA500
 *   kill         = red    #FF6B6B
 *
 * Presentational. Reads no DB, no env. Receives `rows` (computed in
 * funnel-rollup.ts + cost-observer.ts) as props.
 */

export interface MetricLadderCardProps {
  /**
   * Pre-computed metric readings. One per row in ACTIVATION_METRIC_TARGETS.
   * Order is preserved from the source array; the cost row may have its
   * `observed` and `health` swapped in by the parent after merging the
   * cost-observer reading.
   */
  rows: readonly FunnelMetricReading[];
}

type HealthLabel = "On target" | "Below target" | "Kill";

interface HealthStyle {
  color: string;
  label: HealthLabel;
}

const HEALTH_STYLES: Record<FunnelMetricReading["health"], HealthStyle> = {
  above_target: { color: "#C9A84C", label: "On target" },
  below_target: { color: "#FFA500", label: "Below target" },
  kill: { color: "#FF6B6B", label: "Kill" },
};

function formatValue(value: number, unit: FunnelMetricReading["unit"]): string {
  if (unit === "ratio") {
    return `${Math.round(value * 100)}%`;
  }
  // usd — keep 2 decimals so $0.05 and $0.15 both read cleanly.
  return `$${value.toFixed(2)}`;
}

function formatObserved(
  observed: number | null,
  unit: FunnelMetricReading["unit"],
): string {
  if (observed === null) return "—";
  return formatValue(observed, unit);
}

export function MetricLadderCard({ rows }: MetricLadderCardProps): JSX.Element {
  return (
    <section
      aria-labelledby="metric-ladder-heading"
      className="rounded-xl border border-white/10 bg-[#1A1A2E]/90 p-5 shadow-glass backdrop-blur-glass"
    >
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2
          id="metric-ladder-heading"
          className="font-display text-lg text-[#C9A84C]"
        >
          Metric ladder
        </h2>
        <p className="font-data text-[10px] uppercase tracking-[0.18em] text-white/50">
          Target / kill / observed
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 font-data text-[10px] uppercase tracking-[0.14em] text-white/55">
              <th scope="col" className="py-2 pr-3 font-normal">
                Metric
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-normal">
                Target
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-normal">
                Kill
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-normal">
                Observed
              </th>
              <th scope="col" className="py-2 text-right font-normal">
                Health
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const style = HEALTH_STYLES[row.health];
              return (
                <tr
                  key={row.key}
                  className="border-b border-white/5 last:border-b-0"
                >
                  <th
                    scope="row"
                    className="py-3 pr-3 font-body font-normal text-white/85"
                  >
                    {row.description}
                  </th>
                  <td className="py-3 pr-3 text-right font-data text-white/70 tabular-nums">
                    {formatValue(row.target, row.unit)}
                  </td>
                  <td className="py-3 pr-3 text-right font-data text-white/55 tabular-nums">
                    {formatValue(row.killThreshold, row.unit)}
                  </td>
                  <td
                    className="py-3 pr-3 text-right font-data tabular-nums"
                    style={{ color: style.color }}
                  >
                    {formatObserved(row.observed, row.unit)}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      data-testid={`health-chip-${row.key}`}
                      className="inline-flex items-center rounded-full border px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.14em]"
                      style={{
                        color: style.color,
                        borderColor: `${style.color}55`,
                        backgroundColor: `${style.color}1A`,
                      }}
                      aria-label={`Health: ${style.label}`}
                    >
                      {style.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
