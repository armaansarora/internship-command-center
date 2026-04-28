/**
 * POST /api/briefing/score-answer
 *
 * Scores a single candidate answer against the drill's question + rubric.
 * The client passes the question & rubric alongside the answer so the scoring
 * is self-contained — we don't need to re-load the drill on the server. The
 * `drillId` is required for client-side correlation only; no row is mutated
 * here (the full drill is persisted once at complete-drill time).
 *
 * Returns the STAR breakdown, the weighted overall score, a narrative, and
 * a one-sentence nudge the candidate can use next round.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { scoreAnswer } from "@/lib/ai/structured/score-answer";
import { consumeAiQuota } from "@/lib/ai/quota";
import { getUserTier } from "@/lib/stripe/entitlements";
import { z } from "zod/v4";

const Body = z.object({
  drillId: z.string().uuid(),
  questionId: z.string().min(1).max(200),
  question: z.string().min(1).max(5_000),
  rubric: z.string().min(1).max(5_000),
  answer: z.string().min(1).max(5_000),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const tier = await getUserTier(user.id);
  const quota = await consumeAiQuota(user.id, tier);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "ai_quota_exceeded", used: quota.used, cap: quota.cap },
      { status: 429 },
    );
  }

  const result = await scoreAnswer({
    question: parsed.data.question,
    rubric: parsed.data.rubric,
    answer: parsed.data.answer,
  });
  return NextResponse.json(result);
}
