import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { runBootstrapDiscovery } from "@/lib/onboarding/bootstrap";
import { consumeAiQuota } from "@/lib/ai/quota";
import { getUserTier } from "@/lib/stripe/entitlements";
import { log } from "@/lib/logger";

/**
 * POST /api/onboarding/bootstrap-discovery — Tower's first-run trigger.
 *
 * Invoked the moment Otis completes his intake (or honors a skip). Calls
 * `runJobDiscoveryForUser(user.id)` directly, which runs the real
 * Greenhouse + Lever + seed-library pipeline against the just-saved
 * target profile. Returns the summary the client needs to proceed.
 *
 * Auth: session-auth (not cron-auth) — only the logged-in user can fire
 * their own bootstrap. The 4-hour cron handles everyone-else's cadence.
 *
 * `maxDuration` is bumped to 300 s because a cold first run hitting
 * external boards can genuinely take 30–45 s under production latencies.
 */
export const maxDuration = 300;

export async function POST(_req: Request): Promise<Response> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(user.id);
  const quota = await consumeAiQuota(user.id, tier);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "ai_quota_exceeded", used: quota.used, cap: quota.cap },
      { status: 429 },
    );
  }

  log.info("onboarding.bootstrap.started", { userId: user.id });
  const result = await runBootstrapDiscovery(user.id);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "discovery failed",
        durationMs: result.durationMs,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    newApplications: result.newApplications,
    candidatesSeen: result.candidatesSeen,
    topScore: result.topScore,
    durationMs: result.durationMs,
  });
}
