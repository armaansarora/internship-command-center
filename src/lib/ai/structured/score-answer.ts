/**
 * Score-answer generator.
 *
 * Given a question + rubric + the candidate's answer, asks CPO to grade the
 * STAR components (Situation / Task / Action / Result) on 0-100, compute a
 * weighted overall score, and attach a 1-2 sentence narrative plus an
 * imperative "nudge" the candidate can act on next time.
 *
 * Uses the project's centralised `getAgentModel()` so it inherits AI Gateway
 * routing. All shape-validation happens via the Zod schema — the callsite
 * receives a fully-typed object.
 */

import { generateObject } from "ai";
import { z } from "zod/v4";
import { getAgentModel } from "@/lib/ai/model";

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
    model: getAgentModel(),
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
  });
  return object;
}
