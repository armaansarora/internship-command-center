/**
 * Operations dashboard queries (PR 2 — Activation Funnel Dashboard).
 *
 * Service-role-only readers for the founder-facing `/operations` floor.
 * `engagement_events` is REVOKE-locked to anon/authenticated; only the
 * Supabase admin client can read it. `agent_dispatches` is owner-isolated
 * via RLS, but the dashboard needs a cross-user view of every activation
 * dispatch, so this module also reads it via the service-role client.
 *
 * Three readers:
 *   1. `getActivationFunnelCounts` — aggregate counts per
 *      (beat, outcome), plus user-level totals (unique users, started,
 *      completed). Feeds the funnel chart against ACTIVATION_BEATS.
 *   2. `getRecentActivationDispatches` — last N activation_first_action
 *      dispatches joined to the user's first application for company /
 *      role context. Feeds the recent-activations table.
 *   3. `getActivationCostUsd` — sum of tokens_used across activation
 *      dispatches, converted to USD via a blended Sonnet 4.6 rate.
 *
 * All readers take an injected `SupabaseClient` (use
 * `getSupabaseAdmin()` at the call site) so unit tests can mock the
 * client directly without re-mocking the admin module.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACTIVATION_BEATS,
  ACTIVATION_OUTCOMES,
  type ActivationBeat,
  type ActivationOutcome,
} from "@/lib/analytics/activation-metrics";
import type { Row } from "@/db/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The `engagement_events` table is intentionally absent from
 * `Tables` (database.types.ts) — it has no Drizzle entry and is
 * service-role-only by construction. Mirror the live migration column
 * shape locally so this module stays typed end to end without leaking
 * an entry into the public types surface.
 */
interface EngagementEventRow {
  id: string;
  created_at: string;
  event_type: string;
  user_id: string | null;
  pathname: string;
  route_kind: string;
  floor: string | null;
  metadata: Record<string, unknown>;
}

export type AgentDispatchRow = Row<"agent_dispatches">;

/**
 * Per-(beat, outcome) count grid. Every beat in `ACTIVATION_BEATS` is
 * present in the returned object, even when the count is zero, so the
 * UI never has to do a defensive lookup. Same for outcomes inside each
 * beat — `success`/`abandon`/`error`/`skipped` are all populated.
 */
export type ActivationOutcomeCounts = Record<ActivationOutcome, number>;
export type ActivationBeatCounts = Record<ActivationBeat, ActivationOutcomeCounts>;

export interface ActivationFunnelTotals {
  /** Distinct users that emitted ANY activation_step event in the window. */
  unique_users: number;
  /** Distinct users that emitted a `lobby_reveal` event (gauntlet started). */
  started: number;
  /** Distinct users that emitted a `closing` event with outcome=success. */
  completed: number;
}

export interface ActivationFunnelCounts {
  beats: ActivationBeatCounts;
  totals: ActivationFunnelTotals;
}

export interface RecentActivationDispatch {
  dispatchId: string;
  userId: string;
  status: AgentDispatchRow["status"];
  summary: string | null;
  createdAt: string;
  /** First application company seen on this user, used as activation context. */
  companyName: string | null;
  /** First application role seen on this user. */
  role: string | null;
}

export interface ActivationCost {
  /** Sum of `tokens_used` across activation_first_action dispatches. */
  totalTokens: number;
  /** Blended-rate USD spend over the same set of dispatches. */
  totalUsd: number;
  /** Number of dispatches counted. Lets callers compute cost-per-activation. */
  dispatches: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVATION_EVENT_TYPE = "activation_step";
const ACTIVATION_CRO_TASK = "activation_first_action";

/** Anthropic Sonnet 4.6 input price per 1M tokens (USD). */
const SONNET_46_INPUT_PER_M = 3;
/** Anthropic Sonnet 4.6 output price per 1M tokens (USD). */
const SONNET_46_OUTPUT_PER_M = 15;
/** Observed split: ~60% input / 40% output across activation prompts. */
const INPUT_SHARE = 0.6;
const OUTPUT_SHARE = 0.4;
/** Effective $/token = blended rate / 1M. */
const BLENDED_USD_PER_TOKEN =
  (INPUT_SHARE * SONNET_46_INPUT_PER_M + OUTPUT_SHARE * SONNET_46_OUTPUT_PER_M) /
  1_000_000;

// ---------------------------------------------------------------------------
// Funnel counts
// ---------------------------------------------------------------------------

function makeEmptyBeats(): ActivationBeatCounts {
  const empty = {} as ActivationBeatCounts;
  for (const beat of ACTIVATION_BEATS) {
    const outcomes = {} as ActivationOutcomeCounts;
    for (const outcome of ACTIVATION_OUTCOMES) {
      outcomes[outcome] = 0;
    }
    empty[beat] = outcomes;
  }
  return empty;
}

function isActivationBeat(value: unknown): value is ActivationBeat {
  return (
    typeof value === "string" &&
    (ACTIVATION_BEATS as readonly string[]).includes(value)
  );
}

function isActivationOutcome(value: unknown): value is ActivationOutcome {
  return (
    typeof value === "string" &&
    (ACTIVATION_OUTCOMES as readonly string[]).includes(value)
  );
}

/**
 * Aggregate activation_step rows into a (beat × outcome) count grid plus
 * three user-level totals. The Supabase REST client doesn't support
 * GROUP BY directly, so we pull the (small, append-only, indexed)
 * activation slice and aggregate in memory.
 *
 * `sinceIso` is required — the caller picks the window (last 24h, last
 * 7 days, etc.) and we never read the whole table. The
 * `(event_type, created_at DESC)` index on `engagement_events` makes
 * this cheap even at hundreds of thousands of rows.
 */
export async function getActivationFunnelCounts(
  client: SupabaseClient,
  opts: { sinceIso: string },
): Promise<ActivationFunnelCounts> {
  const { data, error } = await client
    .from("engagement_events")
    .select("user_id, metadata, created_at")
    .eq("event_type", ACTIVATION_EVENT_TYPE)
    .gte("created_at", opts.sinceIso);

  if (error) {
    throw new Error(`getActivationFunnelCounts: ${error.message}`);
  }

  const rows = (data ?? []) as Array<
    Pick<EngagementEventRow, "user_id" | "metadata" | "created_at">
  >;

  const beats = makeEmptyBeats();
  const uniqueUserIds = new Set<string>();
  const startedUserIds = new Set<string>();
  const completedUserIds = new Set<string>();

  for (const row of rows) {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const beat = metadata.beat;
    const outcome = metadata.outcome;

    if (!isActivationBeat(beat) || !isActivationOutcome(outcome)) continue;

    beats[beat][outcome] += 1;

    if (row.user_id) {
      uniqueUserIds.add(row.user_id);
      if (beat === "lobby_reveal") startedUserIds.add(row.user_id);
      if (beat === "closing" && outcome === "success") {
        completedUserIds.add(row.user_id);
      }
    }
  }

  return {
    beats,
    totals: {
      unique_users: uniqueUserIds.size,
      started: startedUserIds.size,
      completed: completedUserIds.size,
    },
  };
}

// ---------------------------------------------------------------------------
// Recent dispatches
// ---------------------------------------------------------------------------

interface RawApplicationContext {
  user_id: string;
  company_name: string | null;
  role: string | null;
  applied_at: string | null;
}

/**
 * Per-user "first application context" lookup. Used by
 * `getRecentActivationDispatches` to attach a company/role label to each
 * dispatch row.
 *
 * Why first-app: `activation_first_action` is a one-shot dispatch that
 * runs immediately after the user's very first imported application
 * (see `executeActivationCRO`). The dispatch row itself does NOT store
 * an `application_id`, so we recover the context by reading the user's
 * earliest application by `applied_at`. If a user later imported more
 * apps, those are irrelevant — activation only ever pointed at the first.
 */
async function loadFirstApplicationByUser(
  client: SupabaseClient,
  userIds: readonly string[],
): Promise<Map<string, { companyName: string | null; role: string | null }>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await client
    .from("applications")
    .select("user_id, company_name, role, applied_at")
    .in("user_id", userIds as string[])
    .order("applied_at", { ascending: true, nullsFirst: true });

  if (error) {
    throw new Error(`loadFirstApplicationByUser: ${error.message}`);
  }

  const rows = (data ?? []) as RawApplicationContext[];
  const byUser = new Map<
    string,
    { companyName: string | null; role: string | null }
  >();
  for (const row of rows) {
    if (byUser.has(row.user_id)) continue;
    byUser.set(row.user_id, {
      companyName: row.company_name ?? null,
      role: row.role ?? null,
    });
  }
  return byUser;
}

/**
 * Fetch the N most recent `activation_first_action` dispatches, with
 * company/role context attached from each user's first application.
 *
 * Two REST hops by design: PostgREST embedded-resource joins on
 * `agent_dispatches → applications` would need a foreign-key column,
 * which doesn't exist (the dispatch row carries `appId` only in local
 * function scope; see comment in `loadFirstApplicationByUser`). The
 * two-hop pattern keeps the contract explicit at the cost of a single
 * extra round-trip.
 */
export async function getRecentActivationDispatches(
  client: SupabaseClient,
  opts: { limit: number },
): Promise<RecentActivationDispatch[]> {
  const { data, error } = await client
    .from("agent_dispatches")
    .select("id, user_id, status, summary, created_at")
    .eq("task", ACTIVATION_CRO_TASK)
    .order("created_at", { ascending: false })
    .limit(opts.limit);

  if (error) {
    throw new Error(`getRecentActivationDispatches: ${error.message}`);
  }

  const dispatchRows = (data ?? []) as Array<{
    id: string;
    user_id: string;
    status: AgentDispatchRow["status"];
    summary: string | null;
    created_at: string;
  }>;

  const userIds = Array.from(new Set(dispatchRows.map((r) => r.user_id)));
  const contextByUser = await loadFirstApplicationByUser(client, userIds);

  return dispatchRows.map((row) => {
    const ctx = contextByUser.get(row.user_id);
    return {
      dispatchId: row.id,
      userId: row.user_id,
      status: row.status,
      summary: row.summary,
      createdAt: row.created_at,
      companyName: ctx?.companyName ?? null,
      role: ctx?.role ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------

/**
 * Sum `tokens_used` across activation_first_action dispatches since
 * `sinceIso`, convert to USD with a blended Sonnet 4.6 input/output rate.
 *
 * The blend (60/40) is an observed-average heuristic; it's the right
 * shape to compare against `cost_per_activation_usd` in
 * `ACTIVATION_METRIC_TARGETS`. When the activation prompt changes
 * materially, revisit the split rather than the prices.
 */
export async function getActivationCostUsd(
  client: SupabaseClient,
  opts: { sinceIso: string },
): Promise<ActivationCost> {
  const { data, error } = await client
    .from("agent_dispatches")
    .select("tokens_used")
    .eq("task", ACTIVATION_CRO_TASK)
    .gte("created_at", opts.sinceIso);

  if (error) {
    throw new Error(`getActivationCostUsd: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ tokens_used: number | null }>;
  let totalTokens = 0;
  for (const row of rows) {
    const t = row.tokens_used;
    if (typeof t === "number" && Number.isFinite(t)) {
      totalTokens += t;
    }
  }

  return {
    totalTokens,
    totalUsd: totalTokens * BLENDED_USD_PER_TOKEN,
    dispatches: rows.length,
  };
}
