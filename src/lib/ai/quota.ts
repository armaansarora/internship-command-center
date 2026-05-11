import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PRICING_CONFIG } from "@/lib/config/pricing-config";
import { log } from "@/lib/logger";
import { checkGlobalSpendBrake } from "@/lib/ai/spend-brake";

/**
 * Per-user-per-day AI call cap.
 *
 * Defends against runaway Anthropic/OpenAI bills on the Free tier and against
 * abuse on paid tiers. Uses the atomic `consume_ai_call_quota(uuid, integer)`
 * RPC — single round-trip increments and checks the cap.
 *
 * Wire into AI routes like this:
 *
 * ```ts
 * const quota = await consumeAiQuota(user.id, currentTier);
 * if (!quota.allowed) {
 *   return NextResponse.json({ error: "ai_quota_exceeded" }, { status: 429 });
 * }
 * ```
 *
 * Two checks run in sequence:
 *
 *  1. **Global spend brake** (`checkGlobalSpendBrake`) — fails CLOSED on RPC
 *     error and fires when the day's aggregate Anthropic bill crosses
 *     `KILL_AI_SPEND_USD`. Owner-override users skip this check. Telemetry
 *     records every brake-fired denial so the Watchdog can alert.
 *  2. **Per-user cap** (the RPC below) — fails OPEN on RPC error so a
 *     transient DB hiccup doesn't lock every user out of every AI surface.
 *     The cron-health table surfaces sustained failures to the owner.
 *
 * The brake runs first deliberately: if the brake has fired, we MUST NOT
 * consume any quota (incrementing the per-user counter on a denied call
 * would punish the user for an outage they didn't cause).
 */
/**
 * Tier dimension for AI cost caps.
 *
 * `team` is kept for back-compat with legacy `user_profiles.subscription_tier`
 * rows; `seasonPass` is the post-fork one-time SKU. All non-free tiers share
 * the same daily cap (`paidAiCallsPerDay`), so the distinction is purely
 * narrative.
 */
type AiTier = "free" | "pro" | "seasonPass" | "team";

export interface QuotaResult {
  allowed: boolean;
  used: number;
  cap: number;
  reason?:
    | "exceeded"
    | "rpc_error"
    | "global_spend_cap"
    | "spend_brake_unavailable";
}

function capForTier(tier: AiTier): number {
  if (tier === "free") return PRICING_CONFIG.costCaps.freeAiCallsPerDay;
  return PRICING_CONFIG.costCaps.paidAiCallsPerDay;
}

export async function consumeAiQuota(
  userId: string,
  tier: AiTier,
): Promise<QuotaResult> {
  const cap = capForTier(tier);

  // ── Step 1: Global spend brake (fails CLOSED) ──────────────────────────
  // The brake is checked BEFORE the per-user RPC so a fired brake does not
  // wastefully consume a quota slot. The owner override inside
  // `checkGlobalSpendBrake` lets the founder keep working while the brake is
  // engaged.
  const brake = await checkGlobalSpendBrake(userId);
  if (!brake.allowed) {
    return {
      allowed: false,
      used: 0,
      cap,
      reason: brake.reason ?? "spend_brake_unavailable",
    };
  }

  // ── Step 2: Per-user atomic cap RPC (fails OPEN) ───────────────────────
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("consume_ai_call_quota", {
      p_user_id: userId,
      p_cap: cap,
    });

    if (error) {
      // P0001 with our message means "over cap" — the RPC raised on purpose.
      const msg = (error as { message?: string }).message ?? "";
      if (msg.includes("ai_quota_exceeded")) {
        return { allowed: false, used: cap + 1, cap, reason: "exceeded" };
      }
      log.error("ai_quota.rpc_error", { code: (error as { code?: string }).code, msg });
      // Fail open on infra error.
      return { allowed: true, used: 0, cap, reason: "rpc_error" };
    }

    const used = typeof data === "number" ? data : 0;
    return { allowed: used <= cap, used, cap };
  } catch (err) {
    log.error("ai_quota.unexpected", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { allowed: true, used: 0, cap, reason: "rpc_error" };
  }
}

export async function readAiQuotaForToday(
  userId: string,
  tier: AiTier,
): Promise<{ used: number; cap: number }> {
  const cap = capForTier(tier);
  try {
    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("ai_call_quotas")
      .select("calls_used")
      .eq("user_id", userId)
      .eq("quota_date", today)
      .maybeSingle();
    if (error || !data) return { used: 0, cap };
    return { used: data.calls_used as number, cap };
  } catch {
    return { used: 0, cap };
  }
}
