"use client";

import { useMemo, useState, type JSX } from "react";
import {
  computeFunnelMetrics,
  type FunnelMetricReading,
} from "@/lib/analytics/funnel-rollup";
import { computeObservedCostPerActivation } from "@/lib/analytics/cost-observer";
import type {
  ActivationFunnelCounts,
  ActivationCost,
  RecentActivationDispatch,
} from "@/lib/db/queries/operations-rest";
import type {
  DailyAiSpendReading,
  IncidentAlertView,
} from "@/lib/db/queries/operations-ops-rest";
import type { ProductionHealthSummary } from "@/lib/observability/production-health";
import { MetricLadderCard } from "./MetricLadderCard";
import { FunnelChart } from "./FunnelChart";
import { CostMeter } from "./CostMeter";
import { RecentActivationsTable } from "./RecentActivationsTable";
import { CronHealthPanel } from "./CronHealthPanel";
import { IncidentAlertsPanel } from "./IncidentAlertsPanel";
import { AiSpendPanel } from "./AiSpendPanel";

/**
 * `/operations` — Operations Dashboard client shell (GTM OpsDashboard).
 *
 * Renders four panels for the founder, sourced entirely from
 * service-role-only tables the route shell pre-fetches:
 *
 *   1. Activation funnel — metric ladder + cost meter + funnel chart +
 *      recent activations table (existing PR 2 surface; window-toggled).
 *   2. Cron health — last run per cron, sourced from `cron_runs`.
 *   3. Lighthouse incidents — recent rows from `incident_alerts`.
 *   4. AI spend — today's `v_daily_ai_spend_cents` value vs the
 *      `KILL_AI_SPEND_USD` cap, with a progress bar.
 *
 * The activation funnel keeps its 7-day / 24-hour toggle — the math
 * (`computeFunnelMetrics` + `computeObservedCostPerActivation`) is run
 * in `useMemo` so the founder can flip the window without a round-trip.
 * The other three panels are global (today, currently-open, last 25),
 * so the window toggle does not apply.
 *
 * No PII surfaces beyond what already lives on the dispatch row. The
 * skyline / building chrome is intentionally absent — this is the
 * Penthouse window onto Operations, not a floor in its own right; the
 * parent `(authenticated)/layout.tsx` provides the world-shell.
 */
export interface OperationsClientProps {
  /** Activation funnel counts over the last 7 days. */
  funnel7d: ActivationFunnelCounts;
  /** Activation funnel counts over the last 24 hours (compare window). */
  funnel24h: ActivationFunnelCounts;
  /** Last N activation_first_action dispatches with first-app context. */
  recentDispatches: RecentActivationDispatch[];
  /** Token + USD cost over the last 7 days. */
  cost7d: ActivationCost;
  /** Token + USD cost over the last 24 hours. */
  cost24h: ActivationCost;
  /**
   * Cron summary from `readProductionHealthSummary`. `null` when the
   * production-health read failed entirely — the panel renders an
   * informational empty state in that case.
   */
  cron: ProductionHealthSummary["cron"] | null;
  /**
   * Recent incidents from `incident_alerts`, open first then resolved.
   * Empty array is the steady-state and renders the "system quiet" view.
   */
  incidents: readonly IncidentAlertView[];
  /**
   * Today's AI spend reading. Always present; the container returns a
   * zeroed-out reading on read failure so this panel renders the
   * empty-state value rather than a broken card.
   */
  spend: DailyAiSpendReading;
  /** ISO timestamp the route generated this snapshot (server-render time). */
  generatedAt: string;
  /** ISO bounds the route used so the client can label its windows. */
  windows: {
    sevenDaysAgo: string;
    twentyFourHoursAgo: string;
  };
}

type Window = "7d" | "24h";

/**
 * Stitch funnel counts + cost reading into the metric ladder rows. The
 * cost row is emitted by `computeFunnelMetrics` with `observed: null`
 * by design — we merge in the cost-observer reading here so the ladder
 * has all seven rows live in a single pass.
 *
 * D1 / D7 / D30 retention are not derivable from beat counts alone — they
 * require a per-user join against the new `user_return` engagement_events
 * rows. Until that retention query lands, the three return rows pass
 * through with `observed: null`, which renders as an em dash — the
 * dashboard never shows a fake zero.
 */
function buildLadderRows(
  funnel: ActivationFunnelCounts,
  cost: ActivationCost,
): readonly FunnelMetricReading[] {
  const beatRows = computeFunnelMetrics({
    beats: funnel.beats,
    uniqueLanding: funnel.totals.started,
    uniqueSignin: funnel.totals.unique_users,
    activatedUsersD1: 0,
    activatedUsersD7: 0,
    totalActivations: funnel.totals.completed,
  });

  const costReading = computeObservedCostPerActivation({
    totalCostUsd: cost.totalUsd,
    totalActivations: funnel.totals.completed,
  });

  return beatRows.map((row) =>
    row.key === "cost_per_activation_usd"
      ? {
          ...row,
          observed: costReading.observed,
          health: costReading.health,
        }
      : row,
  );
}

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function OperationsClient({
  funnel7d,
  funnel24h,
  cost7d,
  cost24h,
  recentDispatches,
  cron,
  incidents,
  spend,
  generatedAt,
}: OperationsClientProps): JSX.Element {
  const [activeWindow, setActiveWindow] = useState<Window>("7d");

  const activeFunnel = activeWindow === "7d" ? funnel7d : funnel24h;
  const activeCost = activeWindow === "7d" ? cost7d : cost24h;
  const windowLabel =
    activeWindow === "7d" ? "Last 7 days" : "Last 24 hours";

  const ladderRows = useMemo(
    () => buildLadderRows(activeFunnel, activeCost),
    [activeFunnel, activeCost],
  );

  const observedCostPerActivation = useMemo(() => {
    const reading = computeObservedCostPerActivation({
      totalCostUsd: activeCost.totalUsd,
      totalActivations: activeFunnel.totals.completed,
    });
    return reading.observed;
  }, [activeCost, activeFunnel]);

  return (
    <main
      className="min-h-dvh bg-[#0A0A14] px-4 py-8 text-white sm:px-6 lg:px-10"
      aria-labelledby="operations-heading"
    >
      <header className="mx-auto mb-8 flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-data text-[10px] uppercase tracking-[0.22em] text-[#C9A84C]/80">
            The Tower / Operations
          </p>
          <h1
            id="operations-heading"
            className="mt-1 font-display text-4xl text-white"
          >
            Operations
          </h1>
          <p className="mt-1 font-body text-sm text-white/65">
            Activation funnel — {windowLabel.toLowerCase()}.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div
            role="group"
            aria-label="Time window"
            className="inline-flex overflow-hidden rounded-full border border-white/10 bg-white/[0.04]"
          >
            <WindowToggle
              active={activeWindow === "24h"}
              onClick={() => setActiveWindow("24h")}
              label="24h"
            />
            <WindowToggle
              active={activeWindow === "7d"}
              onClick={() => setActiveWindow("7d")}
              label="7d"
            />
          </div>
          <p
            className="font-data text-[10px] uppercase tracking-[0.14em] text-white/45"
            aria-live="polite"
          >
            Snapshot {formatGeneratedAt(generatedAt)}
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 sm:grid-cols-12">
        <div className="sm:col-span-12 lg:col-span-7">
          <MetricLadderCard rows={ladderRows} />
        </div>
        <div className="sm:col-span-12 lg:col-span-5">
          <CostMeter
            cost={activeCost}
            observedCostPerActivation={observedCostPerActivation}
            windowLabel={windowLabel}
          />
        </div>
        <div className="sm:col-span-12 lg:col-span-7">
          <FunnelChart beats={activeFunnel.beats} />
        </div>
        <div className="sm:col-span-12 lg:col-span-5">
          <RecentActivationsTable dispatches={recentDispatches} />
        </div>

        {/* Day-1 production-health panels: cron / incidents / spend. */}
        <div className="sm:col-span-12 lg:col-span-7">
          <CronHealthPanel cron={cron} />
        </div>
        <div className="sm:col-span-12 lg:col-span-5">
          <AiSpendPanel spend={spend} />
        </div>
        <div className="sm:col-span-12">
          <IncidentAlertsPanel incidents={incidents} />
        </div>
      </div>
    </main>
  );
}

function WindowToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "px-4 py-1.5 font-data text-[11px] uppercase tracking-[0.18em] transition-colors " +
        (active
          ? "bg-[#C9A84C] text-[#0A0A14]"
          : "text-white/65 hover:text-white")
      }
    >
      {label}
    </button>
  );
}
