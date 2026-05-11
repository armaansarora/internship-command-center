/**
 * Global AI-spend brake — Lighthouse SpendBrake.
 *
 * The per-user `consumeAiQuota` cap bounds a single user's call count. It
 * does NOT bound the aggregate daily dollar bill. A free-tier abuse wave or
 * a buggy prompt loop could fan out across many users and push Anthropic
 * spend into four figures overnight before any human noticed.
 *
 * This helper closes that gap. It reads a single scalar from the
 * `v_daily_ai_spend_cents` view (see migration 0037) and compares the
 * day's running total to `KILL_AI_SPEND_USD`. When the running total
 * crosses the cap, the brake fires and every non-owner AI call is denied
 * until UTC midnight rolls the bucket over.
 *
 * Fail-CLOSED contract
 * --------------------
 * This is the load-bearing inversion of the per-user policy. The per-user
 * quota fails OPEN on RPC error (a transient DB hiccup must not lock every
 * user out). The global brake fails CLOSED on RPC error — a brake that
 * fails open is no brake. If we cannot prove we are under the cap, we must
 * assume we are over it. The owner override means the founder is never
 * locked out by their own brake.
 *
 * Telemetry
 * ---------
 * When the brake fires for a non-owner, this helper writes a marker row
 * into `agent_logs` (`reason = 'global_spend_cap'`, `cost_cents = 0`) so
 * the Watchdog cron can detect "brake-fired today" as an alert signal.
 * Telemetry failures are swallowed — telemetry must never block the brake.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

export type SpendBrakeReason =
  | "global_spend_cap"
  | "spend_brake_unavailable";

export interface SpendBrakeResult {
  /** True iff the caller may proceed. False when the brake has fired. */
  allowed: boolean;
  /** Set when `allowed === false`. */
  reason?: SpendBrakeReason;
  /** Day's spend at the time of the check (cents). Undefined on RPC error. */
  totalCostCents?: number;
  /** The cap in cents that the brake checked against. */
  capCents?: number;
  /** True when the caller's id matched the owner override list. */
  ownerOverride?: boolean;
}

/**
 * Parse the comma/semicolon/whitespace-separated owner override list from env.
 * Tolerant to the formats Vercel env editors produce when humans paste UUIDs
 * (commas, spaces, semicolons, trailing newlines).
 */
function parseOwnerOverrideIds(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0),
  );
}

/**
 * True iff `userId` is on the owner-override list. Comparison is
 * case-insensitive so a paste with mixed-case UUIDs still matches.
 */
export function isSpendBrakeOwnerOverride(userId: string): boolean {
  const allowlist = parseOwnerOverrideIds(env().OWNER_SPEND_OVERRIDE_USER_IDS);
  return allowlist.has(userId.toLowerCase());
}

/**
 * Write a single brake-fired marker into `agent_logs`. Service-role write so
 * RLS does not bounce it. Never throws — the brake decision has priority
 * over any telemetry write failure.
 */
async function recordBrakeFired(userId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("agent_logs").insert({
      user_id: userId,
      agent: "spend_brake",
      action: "global_spend_cap",
      status: "failed",
      error: "global_spend_cap",
      cost_cents: 0,
      tokens_used: null,
      duration_ms: 0,
      completed_at: new Date().toISOString(),
    });
    if (error) {
      log.warn("spend_brake.telemetry_failed", { msg: error.message });
    }
  } catch (err) {
    log.warn("spend_brake.telemetry_threw", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Decide whether the global AI-spend brake permits this call.
 *
 * - Owner-override users always pass.
 * - When the day's rollup is under the cap, return `{ allowed: true }`.
 * - When the day's rollup is at or over the cap, return
 *   `{ allowed: false, reason: "global_spend_cap" }` AND emit a telemetry
 *   marker so the Watchdog can detect the fired state.
 * - When the rollup read fails for ANY reason (RPC error, network blip,
 *   timeout, malformed row), return `{ allowed: false, reason:
 *   "spend_brake_unavailable" }`. Fail-CLOSED on uncertainty.
 *
 * `nowIso` is injected for tests (a deterministic clock makes the per-day
 * bucket math testable without freezing the real `Date`).
 */
export async function checkGlobalSpendBrake(
  userId: string,
  options: { nowIso?: string } = {},
): Promise<SpendBrakeResult> {
  const capDollars = env().KILL_AI_SPEND_USD;
  const capCents = Math.round(capDollars * 100);

  if (isSpendBrakeOwnerOverride(userId)) {
    return { allowed: true, capCents, ownerOverride: true };
  }

  const today = (options.nowIso ?? new Date().toISOString()).slice(0, 10);

  let rollup: { total_cost_cents: number | string | null } | null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("v_daily_ai_spend_cents")
      .select("total_cost_cents")
      .eq("day", today)
      .maybeSingle();

    if (error) {
      log.error("spend_brake.rpc_error", {
        msg: error.message,
        code: (error as { code?: string }).code,
      });
      return { allowed: false, reason: "spend_brake_unavailable", capCents };
    }
    rollup = data as typeof rollup;
  } catch (err) {
    log.error("spend_brake.unexpected", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { allowed: false, reason: "spend_brake_unavailable", capCents };
  }

  // `maybeSingle` returns null when the view has no row for today — that means
  // no spend yet today, which is the "allowed" path.
  const rawTotal = rollup?.total_cost_cents ?? 0;
  const totalCostCents =
    typeof rawTotal === "string" ? Number(rawTotal) : rawTotal;

  if (!Number.isFinite(totalCostCents)) {
    log.error("spend_brake.malformed_total", { rawTotal });
    return { allowed: false, reason: "spend_brake_unavailable", capCents };
  }

  if (totalCostCents >= capCents) {
    // Fire-and-forget telemetry; do not await the marker because the
    // calling AI route is on the user's hot path and the brake decision
    // is already made.
    void recordBrakeFired(userId);
    return {
      allowed: false,
      reason: "global_spend_cap",
      totalCostCents,
      capCents,
    };
  }

  return { allowed: true, totalCostCents, capCents };
}
