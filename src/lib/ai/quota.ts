import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { LAUNCH_CONFIG } from "@/lib/launch-config";
import { log } from "@/lib/logger";

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
 * On infrastructure failure we fail-OPEN so a transient DB hiccup doesn't
 * lock every user out of every AI surface. The cron-health table will surface
 * sustained failures to the owner.
 */
type AiTier = "free" | "pro" | "team";

export interface QuotaResult {
  allowed: boolean;
  used: number;
  cap: number;
  reason?: "exceeded" | "rpc_error";
}

function capForTier(tier: AiTier): number {
  if (tier === "free") return LAUNCH_CONFIG.costCaps.freeAiCallsPerDay;
  return LAUNCH_CONFIG.costCaps.paidAiCallsPerDay;
}

export async function consumeAiQuota(
  userId: string,
  tier: AiTier,
): Promise<QuotaResult> {
  const cap = capForTier(tier);
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
