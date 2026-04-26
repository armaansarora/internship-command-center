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
import { z } from "zod/v4";

const Body = z.object({
  drillId: z.string().uuid(),
  questionId: z.string().min(1),
  question: z.string().min(1),
  rubric: z.string().min(1),
  answer: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const result = await scoreAnswer({
    question: parsed.data.question,
    rubric: parsed.data.rubric,
    answer: parsed.data.answer,
  });
  return NextResponse.json(result);
}
