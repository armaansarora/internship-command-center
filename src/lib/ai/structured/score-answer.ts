/**
 * Score-answer generator.
 *
 * Given a question + rubric + the candidate's answer, asks CPO to grade the
 * STAR components (Situation / Task / Action / Result) on 0-100, compute a
 * weighted overall score, and attach a 1-2 sentence narrative plus an
 * imperative "nudge" the candidate can act on next time.
 *
 * Uses `getFastModel()` so it inherits AI Gateway routing on the cheap
 * Haiku 4.5 tier. Scoring against a rubric with a fixed weighting (S=15,
 * T=15, A=40, R=30) is a templated structural task — Sonnet's full reasoning
 * is wasted here, and Haiku produces the same shape at ~12% of the input
 * cost and ~25% of the output cost.
 *
 * All shape-validation happens via the Zod schema — the callsite receives a
 * fully-typed object.
 */

import { generateObject } from "ai";
import { z } from "zod/v4";
import { getFastModel } from "@/lib/ai/model";
import { SCORE_ANSWER_MAX_OUTPUT_TOKENS } from "@/lib/ai/output-budgets";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const Schema = z.object({
  stars: z.object({
    s: z.number().min(0).max(100),
    t: z.number().min(0).max(100),
    a: z.number().min(0).max(100),
    r: z.number().min(0).max(100),
  }),
  score: z.number().min(0).max(100),
  narrative: z.string().min(10),
  nudge: z.string().min(5),
});

export type ScoredAnswer = z.infer<typeof Schema>;

export interface ScoreAnswerInput {
  question: string;
  rubric: string;
  answer: string;
}

/**
 * Score a candidate's answer against the question's rubric.
 *
 * Weights: S=15%, T=15%, A=40%, R=30%. The model is asked to compute the
 * weighted score itself so the narrative + score stay internally consistent.
 */
export async function scoreAnswer(input: ScoreAnswerInput): Promise<ScoredAnswer> {
  const { object } = await generateObject({
    model: getFastModel(),
    schema: Schema,
    prompt: [
      "You are CPO — a drill-sergeant interview coach.",
      `Question: ${input.question}`,
      `Rubric: ${input.rubric}`,
      `Candidate answer: ${input.answer}`,
      "Score STAR components 0-100 each. Compute overall score as weighted: S=15%, T=15%, A=40%, R=30%.",
      "Narrative: 1-2 sentences of specific feedback (what worked, what to tighten).",
      "Nudge: one short imperative sentence for the candidate to improve the answer next time.",
    ].join("\n"),
    maxOutputTokens: SCORE_ANSWER_MAX_OUTPUT_TOKENS,
  });
  return object;
}
