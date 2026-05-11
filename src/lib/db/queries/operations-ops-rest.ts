/**
 * Operations dashboard — Day-1 production-health readers.
 *
 * The activation funnel readers live in `operations-rest.ts` (PR 2). This
 * module adds the three Day-1 panels that make `/operations` meaningful
 * the moment the founder flips `TOWER_OPERATIONS_DASHBOARD=1`:
 *
 *   1. `getCronHealth` — last successful run + last failure per cron,
 *      sourced from `cron_runs`. Re-uses `summarizeCronRuns` semantics
 *      via the shared `production-health.ts` aggregator (DO NOT
 *      reimplement; that file is the contract).
 *   2. `getRecentIncidentAlerts` — most recent N rows from
 *      `incident_alerts` (Lighthouse Watchdog state machine), open
 *      first then resolved.
 *   3. `getDailyAiSpendCents` — today's running total from the
 *      `v_daily_ai_spend_cents` Postgres view, used by `spend-brake.ts`
 *      to fire the global kill-switch.
 *
 * All readers go through the Supabase REST client — Drizzle's `db` does
 * not work in Vercel serverless because the Supabase DB is IPv6-only
 * (see CLAUDE.md gotcha #1). The page constructs `getSupabaseAdmin()`
 * once and threads it through every reader so unit tests can mock the
 * client directly.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Row } from "@/db/database.types";

// ---------------------------------------------------------------------------
// Incident Alerts
// ---------------------------------------------------------------------------

/**
 * snake_case row shape PostgREST returns from `incident_alerts`. Derived
 * from the Drizzle schema so the structure stays welded to the table.
 */
export type IncidentAlertRow = Row<"incident_alerts">;

/**
 * Display projection of an incident — already trimmed for the UI. The
 * panel does not surface raw email-state plumbing; only fields the
 * operator needs to triage.
 */
export interface IncidentAlertView {
  id: string;
  jobName: string;
  severity: "warn" | "crit";
  lastSeenValue: string | null;
  openedAt: string;
  resolvedAt: string | null;
  /** True iff `resolved_at IS NULL`. Cached so the UI does not re-derive. */
  open: boolean;
}

/**
 * Fetch the most recent N `incident_alerts` rows. Open incidents (where
 * `resolved_at IS NULL`) come back first, then resolved rows newest-first
 * — so the panel surfaces what's currently paging before what is history.
 *
 * Service-role-only: `incident_alerts` has no policy and REVOKEs anon /
 * authenticated grants (migration 0036). The Supabase REST client passed
 * here MUST be the `getSupabaseAdmin()` instance; user-scoped clients
 * cannot read this table even if RLS were rewritten.
 *
 * Failure mode: returns `[]` on any error path so the panel renders an
 * empty state rather than crashing the whole dashboard. The watchdog is
 * the source of truth for paging; the dashboard is read-only diagnostics.
 */
export async function getRecentIncidentAlerts(
  client: SupabaseClient,
  opts: { limit?: number } = {},
): Promise<IncidentAlertView[]> {
  const limit = opts.limit ?? 25;

  // PostgREST does not support a single multi-column order that combines
  // `resolved_at NULLS FIRST` with `opened_at DESC` reliably, so we pull a
  // small window ordered by opened_at and partition open / resolved in JS.
  // The table has an index on (job_name, resolved_at) and a daily insert
  // rate measured in single digits, so an N=50 select is effectively O(1).
  const { data, error } = await client
    .from("incident_alerts")
    .select(
      "id, job_name, severity, last_seen_value, opened_at, resolved_at",
    )
    .order("opened_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  const rows = (data ?? []) as Array<
    Pick<
      IncidentAlertRow,
      | "id"
      | "job_name"
      | "severity"
      | "last_seen_value"
      | "opened_at"
      | "resolved_at"
    >
  >;

  const open: IncidentAlertView[] = [];
  const resolved: IncidentAlertView[] = [];
  for (const row of rows) {
    const view: IncidentAlertView = {
      id: row.id,
      jobName: row.job_name,
      severity: row.severity,
      lastSeenValue: row.last_seen_value,
      openedAt: row.opened_at,
      resolvedAt: row.resolved_at,
      open: row.resolved_at === null,
    };
    if (view.open) open.push(view);
    else resolved.push(view);
  }

  return [...open, ...resolved];
}

// ---------------------------------------------------------------------------
// AI Spend
// ---------------------------------------------------------------------------

export interface DailyAiSpendReading {
  /** ISO date (YYYY-MM-DD) the rollup is keyed by. */
  day: string;
  /** Running total of today's `agent_logs.cost_cents` sum. */
  totalCostCents: number;
  /** The `KILL_AI_SPEND_USD` cap converted to cents. */
  capCents: number;
  /**
   * Fraction of the cap used today (0..∞). A reading of 1.0 means the
   * brake has just fired; anything > 1.0 means the rollup overshot.
   * Capped at 2.0 in the UI for the progress bar but we expose the raw
   * value here so the panel can render a "300%" badge if a single agent
   * goes wild.
   */
  usageRatio: number;
}

/**
 * Read today's AI spend from `v_daily_ai_spend_cents`. The view is the
 * same source the global `checkGlobalSpendBrake` reads on every AI call,
 * so the dashboard reading is exactly the value the brake is gating on.
 *
 * The cap comes from `KILL_AI_SPEND_USD` (default $50, override per env).
 * We rely on `@/lib/env` to do the parsing, so this helper only needs to
 * read the live value at call time — Vercel env edits take effect on the
 * next page render.
 *
 * Failure mode: returns `{ totalCostCents: 0, usageRatio: 0 }` with a
 * `null`-safe day so the panel renders the empty state ("$0 / cap").
 * Don't fail-CLOSED here — the brake itself already does that. The
 * dashboard is purely informational.
 */
export async function getDailyAiSpendCents(
  client: SupabaseClient,
  opts: { capUsd: number; nowIso?: string },
): Promise<DailyAiSpendReading> {
  const day = (opts.nowIso ?? new Date().toISOString()).slice(0, 10);
  const capCents = Math.round(opts.capUsd * 100);

  const { data, error } = await client
    .from("v_daily_ai_spend_cents")
    .select("total_cost_cents")
    .eq("day", day)
    .maybeSingle();

  if (error) {
    return { day, totalCostCents: 0, capCents, usageRatio: 0 };
  }

  const raw = (data as { total_cost_cents: number | string | null } | null)
    ?.total_cost_cents ?? 0;
  const totalCostCents = typeof raw === "string" ? Number(raw) : raw;
  if (!Number.isFinite(totalCostCents) || totalCostCents < 0) {
    return { day, totalCostCents: 0, capCents, usageRatio: 0 };
  }

  const usageRatio = capCents > 0 ? totalCostCents / capCents : 0;
  return { day, totalCostCents, capCents, usageRatio };
}
