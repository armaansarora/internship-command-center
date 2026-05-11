/**
 * Funnel rollup — pure logic that turns activation-beat counts into the
 * metric ladder rendered on /operations (PR2 — Activation Funnel Dashboard).
 *
 * Reads no DB, hits no network, touches no env. The Architect's REST queries
 * shape inputs; the Design layer renders outputs. This module is the
 * conversion / health math in between.
 *
 * Single source of truth for thresholds is `ACTIVATION_METRIC_TARGETS` in
 * `activation-metrics.ts`. Health rule per spec:
 *
 *   - ratio metrics:  observed < kill    → "kill"
 *                     observed < target  → "below_target"
 *                     otherwise          → "above_target"
 *   - null observed (zero denominator or missing metric) propagates as null
 *     observed + "below_target" health (treated as failing to hit target,
 *     not as a kill — kills require an observed reading worse than the floor).
 */

import {
  ACTIVATION_METRIC_TARGETS,
  type ActivationBeat,
} from "@/lib/analytics/activation-metrics";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Health classification for a single metric reading. Ratio metrics treat
 * `killThreshold` as a floor; the cost metric (handled in `cost-observer`)
 * treats it as a ceiling.
 */
export type MetricHealth = "above_target" | "below_target" | "kill";

/** Per-outcome counts for a single beat. */
export interface BeatCounts {
  readonly success: number;
  readonly abandon: number;
  readonly skipped: number;
  readonly error: number;
}

/** Inputs to `computeFunnelMetrics`. The Architect's queries hand this in. */
export interface FunnelMetricsInput {
  readonly beats: Record<ActivationBeat, BeatCounts>;
  /** Distinct sessions that hit the landing page in the window. */
  readonly uniqueLanding: number;
  /** Distinct users who completed Google sign-in in the window. */
  readonly uniqueSignin: number;
  /** Activated users (first-app within 5 min) who returned on D1. */
  readonly activatedUsersD1: number;
  /** Users who returned on D7. */
  readonly activatedUsersD7: number;
  /**
   * Users who returned on D30. Optional so the dashboard can render the row
   * with "no data" until the retention table has been populated for at least
   * 30 days. Callers that have a real reading pass a finite non-negative
   * integer; missing readings remain `undefined` and surface as null observed.
   */
  readonly activatedUsersD30?: number;
  /**
   * Activations to date in the window — the denominator for D1 / D7 / D30.
   * The Architect computes this from the same beat events; we accept it as
   * input so this module stays purely functional.
   */
  readonly totalActivations: number;
}

/** A single row in the metric ladder, paired with its observed reading. */
export interface FunnelMetricReading {
  readonly key: string;
  readonly description: string;
  readonly target: number;
  readonly killThreshold: number;
  readonly unit: "ratio" | "usd";
  /**
   * Observed value. `null` when the denominator is zero or the metric is
   * not derivable from the current input (e.g. the cost metric, which lives
   * in `cost-observer.ts`).
   */
  readonly observed: number | null;
  readonly health: MetricHealth;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Safe ratio division. Returns `null` when the denominator is 0 or either
 * input is not a finite, non-negative number — the dashboard renders these
 * as "no data" rather than NaN / Infinity.
 */
function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (numerator < 0 || denominator < 0) return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

/**
 * Health classification for a ratio metric. The spec is explicit: an
 * observed reading strictly below the kill threshold is "kill"; strictly
 * below target is "below_target"; otherwise (observed >= target) is
 * "above_target". A null observed is treated as below target — there is no
 * reading to compare against the floor, so we cannot declare it dead.
 */
function classifyRatio(
  observed: number | null,
  target: number,
  killThreshold: number,
): MetricHealth {
  if (observed === null) return "below_target";
  if (observed < killThreshold) return "kill";
  if (observed < target) return "below_target";
  return "above_target";
}

/** Look up a metric by key. Throws if the key is not in the ladder. */
function metricByKey(key: string) {
  const metric = ACTIVATION_METRIC_TARGETS.find((m) => m.key === key);
  if (!metric) {
    throw new Error(`Unknown activation metric key: ${key}`);
  }
  return metric;
}

// ---------------------------------------------------------------------------
// computeFunnelMetrics
// ---------------------------------------------------------------------------

/**
 * Compute one reading per row in `ACTIVATION_METRIC_TARGETS`.
 *
 * Numerator policies (load-bearing, called out for the auditor):
 *
 *   - `landing_to_signin`         = uniqueSignin / uniqueLanding
 *   - `signin_to_first_app_5min`  = (war_room_reveal.success +
 *                                    google_connect.success) / uniqueSignin
 *
 *     ASSUMPTION (documented per spec): "first app fired" is the union of
 *     the manual path (war_room_reveal success — the user lands in the war
 *     room after intake + manual entry) and the gmail path
 *     (google_connect success — Gmail OAuth completed and at least one app
 *     was synced from the inbox). Both beats are gated on a real
 *     application landing in the user's pipeline, so success counts here
 *     are 1:1 with "first app". A future migration may split these into a
 *     dedicated `first_app_fired` beat; until then this sum is the
 *     numerator.
 *
 *   - `first_app_to_first_action` = cro_recommendation.success /
 *                                    (war_room_reveal.success +
 *                                     google_connect.success)
 *   - `d1_return_activated`       = activatedUsersD1 / totalActivations
 *   - `d7_return`                 = activatedUsersD7 / totalActivations
 *   - `d30_return`                = activatedUsersD30 / totalActivations
 *     (only when the caller supplies activatedUsersD30; otherwise null)
 *   - `cost_per_activation_usd`   = NOT computed here — see cost-observer.ts.
 *     The cost row is emitted with `observed: null` and `health: below_target`
 *     until the caller merges in the cost reading.
 */
export function computeFunnelMetrics(
  input: FunnelMetricsInput,
): readonly FunnelMetricReading[] {
  const { beats, uniqueLanding, uniqueSignin } = input;

  const firstAppFiredCount =
    beats.war_room_reveal.success + beats.google_connect.success;

  // 1. landing_to_signin
  const landingToSigninMetric = metricByKey("landing_to_signin");
  const landingToSigninObserved = safeRatio(uniqueSignin, uniqueLanding);

  // 2. signin_to_first_app_5min
  const signinToFirstAppMetric = metricByKey("signin_to_first_app_5min");
  const signinToFirstAppObserved = safeRatio(firstAppFiredCount, uniqueSignin);

  // 3. first_app_to_first_action
  const firstAppToActionMetric = metricByKey("first_app_to_first_action");
  const firstAppToActionObserved = safeRatio(
    beats.cro_recommendation.success,
    firstAppFiredCount,
  );

  // 4. d1_return_activated
  const d1Metric = metricByKey("d1_return_activated");
  const d1Observed = safeRatio(input.activatedUsersD1, input.totalActivations);

  // 5. d7_return
  const d7Metric = metricByKey("d7_return");
  const d7Observed = safeRatio(input.activatedUsersD7, input.totalActivations);

  // 6. d30_return — only emitted when the caller passes a finite reading.
  // Missing input falls through to a null observed + below_target placeholder
  // so the dashboard renders the row consistently before there are 30 days
  // of retention data.
  const d30Metric = metricByKey("d30_return");
  const d30Observed =
    typeof input.activatedUsersD30 === "number"
      ? safeRatio(input.activatedUsersD30, input.totalActivations)
      : null;

  // 7. cost_per_activation_usd — not derivable from funnel input alone.
  const costMetric = metricByKey("cost_per_activation_usd");

  return [
    {
      key: landingToSigninMetric.key,
      description: landingToSigninMetric.description,
      target: landingToSigninMetric.target,
      killThreshold: landingToSigninMetric.killThreshold,
      unit: landingToSigninMetric.unit,
      observed: landingToSigninObserved,
      health: classifyRatio(
        landingToSigninObserved,
        landingToSigninMetric.target,
        landingToSigninMetric.killThreshold,
      ),
    },
    {
      key: signinToFirstAppMetric.key,
      description: signinToFirstAppMetric.description,
      target: signinToFirstAppMetric.target,
      killThreshold: signinToFirstAppMetric.killThreshold,
      unit: signinToFirstAppMetric.unit,
      observed: signinToFirstAppObserved,
      health: classifyRatio(
        signinToFirstAppObserved,
        signinToFirstAppMetric.target,
        signinToFirstAppMetric.killThreshold,
      ),
    },
    {
      key: firstAppToActionMetric.key,
      description: firstAppToActionMetric.description,
      target: firstAppToActionMetric.target,
      killThreshold: firstAppToActionMetric.killThreshold,
      unit: firstAppToActionMetric.unit,
      observed: firstAppToActionObserved,
      health: classifyRatio(
        firstAppToActionObserved,
        firstAppToActionMetric.target,
        firstAppToActionMetric.killThreshold,
      ),
    },
    {
      key: d1Metric.key,
      description: d1Metric.description,
      target: d1Metric.target,
      killThreshold: d1Metric.killThreshold,
      unit: d1Metric.unit,
      observed: d1Observed,
      health: classifyRatio(
        d1Observed,
        d1Metric.target,
        d1Metric.killThreshold,
      ),
    },
    {
      key: d7Metric.key,
      description: d7Metric.description,
      target: d7Metric.target,
      killThreshold: d7Metric.killThreshold,
      unit: d7Metric.unit,
      observed: d7Observed,
      health: classifyRatio(
        d7Observed,
        d7Metric.target,
        d7Metric.killThreshold,
      ),
    },
    {
      key: d30Metric.key,
      description: d30Metric.description,
      target: d30Metric.target,
      killThreshold: d30Metric.killThreshold,
      unit: d30Metric.unit,
      observed: d30Observed,
      health: classifyRatio(
        d30Observed,
        d30Metric.target,
        d30Metric.killThreshold,
      ),
    },
    {
      key: costMetric.key,
      description: costMetric.description,
      target: costMetric.target,
      killThreshold: costMetric.killThreshold,
      unit: costMetric.unit,
      observed: null,
      health: "below_target",
    },
  ];
}
