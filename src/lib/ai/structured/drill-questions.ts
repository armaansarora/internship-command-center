/**
 * Drill-questions generator.
 *
 * Asks the CPO (drill-sergeant interview coach) to produce EXACTLY 3 mock
 * questions for a given company / role / round, grounded in the prep packet
 * summary when one exists. Returned objects are validated against a Zod
 * schema so the callsite always receives a stable, typed shape.
 *
 * The generator wraps `generateObject` and uses the project's centralised
 * `getAgentModel()` helper so it inherits AI Gateway routing + cost tracking
 * for free.
 */

import { generateObject } from "ai";
import { z } from "zod/v4";
import { getAgentModel } from "@/lib/ai/model";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const Schema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(10),
        category: z.enum(["behavioral", "technical", "culture-fit", "case"]),
        rubric: z.string().min(10),
      }),
    )
    .length(3),
});

export type DrillQuestion = z.infer<typeof Schema>["questions"][number];

export interface DrillQuestionsInput {
  company: string;
  role: string;
  round: string;
  packetSummary: string | null;
}

/**
 * Generate three mock interview questions for a drill.
 *
 * Returns the parsed `questions` array. Throws if the model fails or if the
 * returned object doesn't match the schema — the API route catches to map
 * into a 5xx.
 */
export async function generateDrillQuestions(
  input: DrillQuestionsInput,
): Promise<DrillQuestion[]> {
  const { object } = await generateObject({
    model: getAgentModel(),
    schema: Schema,
    prompt: [
      "You are CPO in The Tower — a drill-sergeant interview coach.",
      `Generate EXACTLY 3 mock interview questions for ${input.company} / ${input.role} / round ${input.round}.`,
      "Categories: behavioral, technical, culture-fit, case. Pick the 3 most likely given the round and company.",
      input.packetSummary ? `Prep packet context: ${input.packetSummary}` : "",
      "Each question must include a 2-sentence rubric describing what a strong answer contains.",
      "Return valid JSON matching the schema — ids can be q1, q2, q3.",
    ]
      .filter(Boolean)
      .join("\n"),
  });
  return object.questions;
}
