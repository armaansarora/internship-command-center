import type { JSX } from "react";
import type { DailyAiSpendReading } from "@/lib/db/queries/operations-ops-rest";

/**
 * AI Spend Panel — today's running spend against the `KILL_AI_SPEND_USD`
 * cap. Same reading the global `checkGlobalSpendBrake` queries on every
 * AI call; this panel is the read-only window for the founder.
 *
 * Visual contract:
 *   - Headline: total USD spent today (large mono digits).
 *   - Cap label: `$X.XX cap` from `KILL_AI_SPEND_USD`.
 *   - Progress bar:
 *       0–60%   gold   #C9A84C  (healthy)
 *       60–90%  amber  #FFA500  (approaching cap)
 *       90%+    red    #FF6B6B  (brake imminent / fired)
 *   - When `usageRatio >= 1.0`, label the bar "Brake fired" — the founder
 *     should see at-a-glance that non-owner AI calls are being denied
 *     until UTC midnight rolls the bucket over.
 *
 * Pure presentation. No env, no DB. The container fetches a
 * `DailyAiSpendReading` (with the cap already merged in by the page).
 */

export interface AiSpendPanelProps {
  /**
   * Today's AI spend reading. `null` is not allowed — the container
   * always returns a zeroed-out reading on read failure so the panel
   * renders the "$0 today" state rather than a broken card.
   */
  spend: DailyAiSpendReading;
}

function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

function clampForBar(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio < 0) return 0;
  if (ratio > 1.5) return 1.5;
  return ratio;
}

function colorFor(ratio: number): string {
  if (ratio >= 0.9) return "#FF6B6B";
  if (ratio >= 0.6) return "#FFA500";
  return "#C9A84C";
}

function statusLabel(ratio: number): string {
  if (ratio >= 1) return "Brake fired";
  if (ratio >= 0.9) return "Near cap";
  if (ratio >= 0.6) return "Approaching";
  return "Healthy";
}

export function AiSpendPanel({ spend }: AiSpendPanelProps): JSX.Element {
  const ratio = spend.usageRatio;
  const clamped = clampForBar(ratio);
  // Bar fills 0..100% of the track; values > 1.0 render as a fully red
  // fill so the overshoot stays visible without warping layout.
  const widthPct = Math.min(clamped, 1) * 100;
  const color = colorFor(ratio);
  const label = statusLabel(ratio);
  const overshootPct = ratio > 1 ? Math.round((ratio - 1) * 100) : 0;

  return (
    <section
      aria-labelledby="ai-spend-heading"
      className="rounded-xl border border-white/10 bg-[#1A1A2E]/90 p-5 shadow-glass backdrop-blur-glass"
    >
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="ai-spend-heading" className="font-display text-lg text-[#C9A84C]">
          AI spend today
        </h2>
        <p
          data-testid="ai-spend-status"
          className="font-data text-[10px] uppercase tracking-[0.18em]"
          style={{ color }}
        >
          {label}
        </p>
      </header>

      <dl className="space-y-4">
        <div>
          <dt className="font-data text-[10px] uppercase tracking-[0.14em] text-white/55">
            Spent ({spend.day})
          </dt>
          <dd
            data-testid="ai-spend-total"
            className="font-data text-3xl text-[#C9A84C] tabular-nums"
          >
            {formatUsd(spend.totalCostCents)}
          </dd>
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="font-data text-[10px] uppercase tracking-[0.14em] text-white/55">
              Cap usage
            </span>
            <span
              data-testid="ai-spend-ratio"
              className="font-data text-white/70 tabular-nums"
              style={{ color }}
            >
              {Math.round(ratio * 100)}%
            </span>
          </div>
          <div
            className="relative h-3 w-full overflow-hidden rounded-full border border-white/5 bg-white/[0.04]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
            aria-label={`AI spend at ${Math.round(ratio * 100)} percent of daily cap`}
          >
            <span
              data-testid="ai-spend-bar-fill"
              className="absolute inset-y-0 left-0 block"
              style={{
                width: `${widthPct}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <p className="mt-1 font-data text-[10px] uppercase tracking-[0.14em] text-white/55">
            {formatUsd(spend.capCents)} cap
            {overshootPct > 0 ? ` · ${overshootPct}% over` : ""}
          </p>
        </div>
      </dl>
    </section>
  );
}
