import type { JSX } from "react";
import {
  ACTIVATION_BEATS,
  ACTIVATION_OUTCOMES,
  type ActivationBeat,
  type ActivationOutcome,
} from "@/lib/analytics/activation-metrics";
import type {
  ActivationBeatCounts,
  ActivationOutcomeCounts,
} from "@/lib/db/queries/operations-rest";

/**
 * Funnel Chart — one horizontal bar per beat in `ACTIVATION_BEATS`,
 * segmented by outcome (success / abandon / skipped / error). Each
 * segment's width is `count / beat_total` as a percentage; an empty
 * beat renders a single muted "no data" bar.
 *
 * Pure CSS (flex with percentage widths) — no charting library. Native
 * `title` attribute on each segment supplies the on-hover count
 * (browser handles the tooltip; respects reduced-motion implicitly).
 *
 * Color encoding stays consistent with the metric ladder: success uses
 * gold to signal "on target," failures (abandon/error) use red and
 * amber, and skipped uses a neutral grey because skipping isn't
 * necessarily bad — some beats are explicitly skippable.
 */

export interface FunnelChartProps {
  /**
   * Per-beat × per-outcome counts. Already populated for every beat in
   * ACTIVATION_BEATS by `getActivationFunnelCounts`; this component does
   * not have to defend against missing keys.
   */
  beats: ActivationBeatCounts;
}

const OUTCOME_STYLES: Record<
  ActivationOutcome,
  { color: string; label: string }
> = {
  success: { color: "#C9A84C", label: "Success" },
  abandon: { color: "#FF6B6B", label: "Abandon" },
  skipped: { color: "#6B7280", label: "Skipped" },
  error: { color: "#FFA500", label: "Error" },
};

const BEAT_LABELS: Record<ActivationBeat, string> = {
  lobby_reveal: "Lobby reveal",
  intake: "Intake",
  google_connect: "Google connect",
  war_room_reveal: "War room reveal",
  cro_recommendation: "CRO recommendation",
  closing: "Closing",
};

function sumOutcomes(counts: ActivationOutcomeCounts): number {
  return (
    counts.success + counts.abandon + counts.skipped + counts.error
  );
}

export function FunnelChart({ beats }: FunnelChartProps): JSX.Element {
  const totals: Record<ActivationBeat, number> = {} as Record<
    ActivationBeat,
    number
  >;
  let grandTotal = 0;
  for (const beat of ACTIVATION_BEATS) {
    const total = sumOutcomes(beats[beat]);
    totals[beat] = total;
    grandTotal += total;
  }

  const isEmpty = grandTotal === 0;

  return (
    <section
      aria-labelledby="funnel-chart-heading"
      className="rounded-xl border border-white/10 bg-[#1A1A2E]/90 p-5 shadow-glass backdrop-blur-glass"
    >
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2
          id="funnel-chart-heading"
          className="font-display text-lg text-[#C9A84C]"
        >
          Activation funnel
        </h2>
        <ul
          className="hidden gap-3 font-data text-[10px] uppercase tracking-[0.14em] text-white/55 sm:flex"
          aria-label="Outcome legend"
        >
          {ACTIVATION_OUTCOMES.map((outcome) => (
            <li key={outcome} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: OUTCOME_STYLES[outcome].color }}
              />
              {OUTCOME_STYLES[outcome].label}
            </li>
          ))}
        </ul>
      </header>

      {isEmpty ? (
        <p
          data-testid="funnel-chart-empty"
          className="py-6 text-center font-body text-sm italic text-white/50"
        >
          No activation events in this window yet.
        </p>
      ) : (
        <ul className="space-y-3" aria-label="Activation beats">
          {ACTIVATION_BEATS.map((beat) => {
            const counts = beats[beat];
            const total = totals[beat];
            const label = BEAT_LABELS[beat];
            return (
              <li key={beat} data-testid={`funnel-beat-${beat}`}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-body text-white/80">{label}</span>
                  <span className="font-data text-white/55 tabular-nums">
                    {total}
                  </span>
                </div>
                <div
                  className="relative flex h-3 w-full overflow-hidden rounded-full border border-white/5 bg-white/[0.04]"
                  role="img"
                  aria-label={`${label}: ${total} events total`}
                >
                  {total === 0 ? (
                    <span
                      data-testid={`funnel-segment-${beat}-empty`}
                      className="block h-full w-full"
                      title={`${label}: 0 events`}
                    />
                  ) : (
                    ACTIVATION_OUTCOMES.map((outcome) => {
                      const count = counts[outcome];
                      if (count === 0) return null;
                      const percent = (count / total) * 100;
                      const style = OUTCOME_STYLES[outcome];
                      return (
                        <span
                          key={outcome}
                          data-testid={`funnel-segment-${beat}-${outcome}`}
                          data-count={count}
                          className="block h-full"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: style.color,
                          }}
                          title={`${style.label}: ${count}`}
                        />
                      );
                    })
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
