import { z } from "zod";

export const DrillInterruptSchema = z.object({
  type: z.enum([
    "no_action_verb",
    "too_much_situation",
    "no_result",
    "wrapping_up",
    "over_time",
  ]),
  atMs: z.number().int().nonnegative(),
});

export const DrillAnswerSchema = z.object({
  text: z.string(),
  durationMs: z.number().int().nonnegative(),
  audioPath: z.string().nullable(),
});

export const DrillQuestionResultSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: z.enum(["behavioral", "technical", "culture-fit", "case"]),
  answer: DrillAnswerSchema,
  stars: z.object({
    s: z.number().min(0).max(100),
    t: z.number().min(0).max(100),
    a: z.number().min(0).max(100),
    r: z.number().min(0).max(100),
  }),
  score: z.number().min(0).max(100),
  narrative: z.string(),
  interrupts: z.array(DrillInterruptSchema),
});

export const DebriefContentSchema = z.object({
  source: z.enum(["drill", "real_interview"]),
  interviewId: z.string().uuid().nullable(),
  company: z.string(),
  round: z.string(),
  questions: z.array(DrillQuestionResultSchema),
  totalScore: z.number().min(0).max(100),
  cpoFeedback: z.string(),
  createdAt: z.string().datetime(),
});

export type DebriefContent = z.infer<typeof DebriefContentSchema>;
export type DrillQuestionResult = z.infer<typeof DrillQuestionResultSchema>;
export type DrillAnswer = z.infer<typeof DrillAnswerSchema>;
export type DrillInterrupt = z.infer<typeof DrillInterruptSchema>;

export function parseDebriefContent(raw: string | null | undefined): DebriefContent {
  if (!raw) throw new Error("empty debrief content");
  const obj = JSON.parse(raw);
  return DebriefContentSchema.parse(obj);
}

export function stringifyDebriefContent(c: DebriefContent): string {
  return JSON.stringify(DebriefContentSchema.parse(c));
}
