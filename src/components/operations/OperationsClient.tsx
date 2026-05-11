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
import { MetricLadderCard } from "./MetricLadderCard";
import { FunnelChart } from "./FunnelChart";
import { CostMeter } from "./CostMeter";
import { RecentActivationsTable } from "./RecentActivationsTable";

/**
 * `/operations` — Activation Funnel Dashboard client shell.
 *
 * Receives raw aggregate counts + dispatch rows from the server page
 * and stitches them into the four cards (metric ladder, funnel, cost
 * meter, recent activations). The activation funnel math
 * (`computeFunnelMetrics` + `computeObservedCostPerActivation`) is run
 * here in `useMemo` so the founder can toggle between the 7-day and
 * 24-hour windows without a round-trip — the server page pre-fetches
 * both windows.
 *
 * No PII surfaces beyond what already lives on the dispatch row. The
 * skyline / building chrome is intentionally absent — this is the
 * Penthouse window onto Operations, not a floor in its own right; the
 * parent `(authenticated)/layout.tsx` already provides the world-shell
 * so the dashboard inherits the building feel without adding decoration
 * that would bury the data.
 *
 * The prop contract is fixed by the route shell (PR2-Architect). New
 * optional props are fine; renaming or dropping any of these seven
 * breaks the route.
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
 * has all six rows live in a single pass.
 *
 * D1 / D7 retention are not derivable from beat counts alone (they
 * require a per-user join we don't fetch in PR2). Until that retention
 * query lands the two rows pass through with `observed: null`, which
 * renders as an em dash — the dashboard never shows a fake zero.
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
