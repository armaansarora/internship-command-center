import type { JSX } from "react";
import type { ActivationCost } from "@/lib/db/queries/operations-rest";

/**
 * Cost Meter — terse three-stat card surfacing the activation spend in
 * the current window:
 *   - total USD spent (the meter's headline)
 *   - observed cost per activation (computed by the parent and passed in)
 *   - total tokens burned
 *
 * Sparkline-styled — large mono digit for the headline, monospaced
 * tabular figures everywhere so the values stay aligned column-to-column
 * across rerenders. No live sparkline (single window snapshot); the
 * card's job is to make the cost ladder row's "Observed" reading
 * legible at a glance.
 */

export interface CostMeterProps {
  /** Aggregate cost reading for the window. */
  cost: ActivationCost;
  /**
   * Observed cost per activation in USD. `null` when there are zero
   * activations in the window — the meter falls back to an em dash.
   * Computed by the parent via `computeObservedCostPerActivation`.
   */
  observedCostPerActivation: number | null;
  /** Optional label for the window (e.g. "Last 7 days"). */
  windowLabel?: string;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatTokens(value: number): string {
  // Compact display: 1,234,567 → "1.23M", 12,345 → "12.3k".
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return value.toString();
}

function formatObservedCost(value: number | null): string {
  if (value === null) return "—";
  // Cost-per-activation is small ($0.05 territory) — show 3 decimals so
  // a $0.034 reading doesn't round down to $0.03 and look like a kill.
  return `$${value.toFixed(3)}`;
}

export function CostMeter({
  cost,
  observedCostPerActivation,
  windowLabel,
}: CostMeterProps): JSX.Element {
  return (
    <section
      aria-labelledby="cost-meter-heading"
      className="rounded-xl border border-white/10 bg-[#1A1A2E]/90 p-5 shadow-glass backdrop-blur-glass"
    >
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2
          id="cost-meter-heading"
          className="font-display text-lg text-[#C9A84C]"
        >
          Cost meter
        </h2>
        {windowLabel ? (
          <p className="font-data text-[10px] uppercase tracking-[0.18em] text-white/50">
            {windowLabel}
          </p>
        ) : null}
      </header>

      <dl className="space-y-4">
        <div>
          <dt className="font-data text-[10px] uppercase tracking-[0.14em] text-white/55">
            Total spend
          </dt>
          <dd
            data-testid="cost-meter-total-usd"
            className="font-data text-3xl text-[#C9A84C] tabular-nums"
          >
            {formatUsd(cost.totalUsd)}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="font-data text-[10px] uppercase tracking-[0.14em] text-white/55">
              Cost / activation
            </dt>
            <dd
              data-testid="cost-meter-per-activation"
              className="font-data text-lg text-white/85 tabular-nums"
            >
              {formatObservedCost(observedCostPerActivation)}
            </dd>
          </div>
          <div>
            <dt className="font-data text-[10px] uppercase tracking-[0.14em] text-white/55">
              Tokens
            </dt>
            <dd
              data-testid="cost-meter-total-tokens"
              className="font-data text-lg text-white/85 tabular-nums"
            >
              {formatTokens(cost.totalTokens)}
            </dd>
          </div>
        </div>

        <div>
          <dt className="font-data text-[10px] uppercase tracking-[0.14em] text-white/55">
            Dispatches counted
          </dt>
          <dd
            data-testid="cost-meter-dispatches"
            className="font-data text-sm text-white/70 tabular-nums"
          >
            {cost.dispatches}
          </dd>
        </div>
      </dl>
    </section>
  );
}
