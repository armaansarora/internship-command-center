/**
 * Cost observer — pure logic that turns a total-spend / total-activations
 * pair into the cost-per-activation reading rendered on /operations
 * (PR2 — Activation Funnel Dashboard).
 *
 * Reads no DB, hits no network, touches no env. The Architect's queries
 * sum the cost ledger and count activations; this module computes the
 * ratio and classifies it against the kill threshold defined in
 * `ACTIVATION_METRIC_TARGETS`.
 *
 * Health rule (per spec, for the "usd" unit — lower is better):
 *
 *   - observed > killThreshold  → "kill"
 *   - observed > target         → "below_target"
 *   - otherwise                 → "above_target"
 */

import {
  ACTIVATION_METRIC_TARGETS,
  type ActivationMetric,
} from "@/lib/analytics/activation-metrics";

import type { MetricHealth } from "@/lib/analytics/funnel-rollup";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CostObserverInput {
  /** Total USD spent in the window across the activation cost ledger. */
  readonly totalCostUsd: number;
  /** Activations that landed in the same window. */
  readonly totalActivations: number;
}

export interface CostObserverReading {
  /**
   * Observed cost per activation, in USD. `null` when there are zero
   * activations (denominator) or either input is not a finite, non-negative
   * number — the dashboard renders these as "no data" rather than NaN /
   * Infinity / negative spend.
   */
  readonly observed: number | null;
  readonly health: MetricHealth;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Look up the cost row in the metric ladder. Throws at import time if a
 * future edit ever removes it — the dashboard depends on this row existing.
 */
function getCostMetric(): ActivationMetric {
  const metric = ACTIVATION_METRIC_TARGETS.find(
    (m) => m.key === "cost_per_activation_usd",
  );
  if (!metric) {
    throw new Error(
      "cost_per_activation_usd missing from ACTIVATION_METRIC_TARGETS",
    );
  }
  if (metric.unit !== "usd") {
    throw new Error(
      `cost_per_activation_usd has unexpected unit: ${metric.unit}`,
    );
  }
  return metric;
}

function classifyUsd(
  observed: number | null,
  target: number,
  killThreshold: number,
): MetricHealth {
  // Null observed: there is no reading. Treated as "below_target" to match
  // funnel-rollup's null-handling convention — the metric is not on-target
  // because there is nothing to confirm it is, but we cannot declare it
  // dead without a reading worse than the floor.
  if (observed === null) return "below_target";
  if (observed > killThreshold) return "kill";
  if (observed > target) return "below_target";
  return "above_target";
}

function safeCostRatio(
  totalCostUsd: number,
  totalActivations: number,
): number | null {
  if (
    !Number.isFinite(totalCostUsd) ||
    !Number.isFinite(totalActivations)
  ) {
    return null;
  }
  if (totalCostUsd < 0 || totalActivations < 0) return null;
  if (totalActivations === 0) return null;
  return totalCostUsd / totalActivations;
}

// ---------------------------------------------------------------------------
// computeObservedCostPerActivation
// ---------------------------------------------------------------------------

/**
 * Compute the observed cost-per-activation reading and classify it against
 * the ladder. Pure: no DB, no fetch, no env reads.
 */
export function computeObservedCostPerActivation(
  input: CostObserverInput,
): CostObserverReading {
  const metric = getCostMetric();
  const observed = safeCostRatio(input.totalCostUsd, input.totalActivations);
  const health = classifyUsd(observed, metric.target, metric.killThreshold);
  return { observed, health };
}
