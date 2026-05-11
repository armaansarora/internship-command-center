/**
 * Activation metric ladder + thin recorder wrapper (PR1 — 5-minute activation
 * gauntlet).
 *
 * Two responsibilities:
 *
 *   1. `ACTIVATION_METRIC_TARGETS` is the single source of truth for the six
 *      conversion / cost metrics that gate the gauntlet's health. Dashboards,
 *      ops scripts, and product reviews import the same array — change a
 *      target or kill-threshold here and every consumer picks it up.
 *
 *   2. `recordActivationStep` is a typed front-door over
 *      `recordServerEngagementEvent`. Callers (the /activate server actions
 *      owned by the Architect) just say which beat fired and what the outcome
 *      was; this module owns the event_type / route_kind mapping and the
 *      shape of the metadata bag that hits the engagement_events table.
 *
 * Fire-and-forget by construction: `recordActivationStep` never throws and
 * never returns a value beyond `Promise<void>`. The underlying
 * `recordServerEngagementEvent` is already kill-switched and swallows its
 * own errors.
 */

import {
  recordServerEngagementEvent,
  type EngagementMetadata,
} from "@/lib/analytics/server-engagement";

// ---------------------------------------------------------------------------
// Beat + outcome enums
// ---------------------------------------------------------------------------

/**
 * Ordered list of beats in the activation flow. The string values are the
 * exact tokens that land in `metadata.beat`. Keep the order canonical so
 * dashboards can render the funnel without a separate ordering source.
 */
export const ACTIVATION_BEATS = [
  "lobby_reveal",
  "intake",
  "google_connect",
  "war_room_reveal",
  "cro_recommendation",
  "closing",
] as const;

export type ActivationBeat = (typeof ACTIVATION_BEATS)[number];

/**
 * Closed set of step outcomes. `success` = beat completed as intended,
 * `abandon` = user left mid-beat, `skipped` = user explicitly skipped,
 * `error` = beat surfaced a recoverable error to the user.
 *
 * Derived from a const array so dashboards can introspect the full set
 * without re-declaring it, and typos at call sites (e.g. "abandoned")
 * fail at compile time instead of silently writing to the warehouse.
 */
export const ACTIVATION_OUTCOMES = [
  "success",
  "abandon",
  "skipped",
  "error",
] as const;
export type ActivationOutcome = (typeof ACTIVATION_OUTCOMES)[number];

/**
 * Provenance hint for the application-import beat. Narrowed so a future
 * caller can't silently write `"gmial"` and discover the typo months later
 * when the funnel chart looks wrong.
 */
export const ACTIVATION_SOURCES = ["gmail", "manual"] as const;
export type ActivationSource = (typeof ACTIVATION_SOURCES)[number];

// ---------------------------------------------------------------------------
// Metric ladder (single source of truth)
// ---------------------------------------------------------------------------

export interface ActivationMetric {
  readonly key: string;
  readonly description: string;
  /** Ratio in [0, 1] for `unit: "ratio"`; USD for `unit: "usd"`. */
  readonly target: number;
  /**
   * Threshold past which the metric is considered failing. For ratio metrics
   * this is the floor (kill < target). For the cost metric it is the
   * ceiling (kill > target).
   */
  readonly killThreshold: number;
  readonly unit: "ratio" | "usd";
}

export const ACTIVATION_METRIC_TARGETS: readonly ActivationMetric[] = [
  {
    key: "landing_to_signin",
    description: "Landing → Google sign-in",
    target: 0.22,
    killThreshold: 0.12,
    unit: "ratio",
  },
  {
    key: "signin_to_first_app_5min",
    description: "Sign-in → first app within 5 min",
    target: 0.6,
    killThreshold: 0.35,
    unit: "ratio",
  },
  {
    key: "first_app_to_first_action",
    description: "First app → first action click",
    target: 0.45,
    killThreshold: 0.25,
    unit: "ratio",
  },
  {
    key: "d1_return_activated",
    description: "D1 return for activated users",
    target: 0.4,
    killThreshold: 0.25,
    unit: "ratio",
  },
  {
    key: "d7_return",
    description: "D7 return",
    target: 0.25,
    killThreshold: 0.12,
    unit: "ratio",
  },
  {
    // D30 retention is the long-tail durability check — it answers "did the
    // user keep coming back a month later?" The target is intentionally
    // ambitious; the kill threshold matches what a single-app pipeline can
    // sustain through a real recruiting season.
    key: "d30_return",
    description: "D30 return",
    target: 0.18,
    killThreshold: 0.08,
    unit: "ratio",
  },
  {
    key: "cost_per_activation_usd",
    description: "Cost per activation",
    target: 0.05,
    killThreshold: 0.15,
    unit: "usd",
  },
] as const;

// ---------------------------------------------------------------------------
// recordActivationStep
// ---------------------------------------------------------------------------

export interface RecordStepInput {
  userId: string | null;
  beat: ActivationBeat;
  outcome: ActivationOutcome;
  /** Time the user spent on this beat, in milliseconds. */
  dwellMs?: number;
  /** Provenance hint — used by the import beat. */
  source?: ActivationSource;
  /** Defaults to "/activate". */
  pathname?: string;
}

/**
 * Thin wrapper over `recordServerEngagementEvent` for activation-step writes.
 *
 * Callers do not need to know the `event_type` / `route_kind` mapping or the
 * allowlisted-metadata-key plumbing — they pass a typed `beat` + `outcome`
 * and the helper assembles the engagement_events row.
 *
 * Fire-and-forget by contract: never throws, never returns a value. The
 * underlying writer already kill-switches on `TOWER_SERVER_ANALYTICS_ENABLED`
 * and swallows its own errors.
 */
export async function recordActivationStep(
  input: RecordStepInput,
): Promise<void> {
  const metadata: EngagementMetadata = {
    beat: input.beat,
    outcome: input.outcome,
  };

  if (typeof input.dwellMs === "number" && Number.isFinite(input.dwellMs)) {
    metadata.dwell_ms = input.dwellMs;
  }

  if (input.source !== undefined) {
    metadata.source = input.source;
  }

  await recordServerEngagementEvent({
    eventType: "activation_step",
    pathname: input.pathname ?? "/activate",
    userId: input.userId,
    floor: null,
    metadata,
  });
}
