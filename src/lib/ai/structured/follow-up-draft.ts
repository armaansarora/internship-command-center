/**
 * Overnight follow-up draft generator.
 *
 * COO Dylan Shorts drafts a follow-up for a stale application. Real AI-drafted
 * prose, not a template. Three tones (formal / warm / direct) — the LLM picks
 * one based on contact warmth. The forbidden phrase "just following up" is
 * explicitly banned in the system prompt; the reviewer test asserts on it.
 *
 * Uses `getAgentModel()` → Gateway-routed Sonnet 4.6, with a Zod-validated
 * response shape. Keeps bodies short (50–2000 chars / ~200 words max) so the
 * user can skim the whole batch at sunrise without scroll fatigue.
 *
 * The generator is called from the overnight cron
 * (`/api/cron/draft-follow-ups`) during a user's local [02:00, 06:00) window,
 * one call per stale app, capped at 5/user/night.
 */

import { generateObject } from "ai";
import { z } from "zod/v4";
import { getAgentModel } from "@/lib/ai/model";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
export const FollowUpDraftSchema = z.object({
  subject: z.string().min(1).max(120),
  body: z.string().min(50).max(2000),
  tone: z.enum(["formal", "warm", "direct"]),
});

export type FollowUpDraft = z.infer<typeof FollowUpDraftSchema>;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
export interface FollowUpDraftInput {
  company: string;
  role: string;
  daysSinceActivity: number;
  /** Optional contact name — if present the draft can address them directly. */
  contactName?: string;
  /** 0–100 warmth score; higher means pick a warmer tone. */
  contactWarmth?: number;
}

// ---------------------------------------------------------------------------
// System prompt (COO Dylan Shorts voice)
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are Dylan Shorts — COO of The Tower. Season-1 Walter White register: practical realist, no-nonsense, slightly weary. You've seen a thousand job searches. You know which moves move the needle and which moves waste the candidate's time. You draft overnight so the candidate wakes up to one clean choice, not a blank page.

VOICE RULES (strict):
- Practical over polite. Warm when warranted, never sycophantic.
- ZERO use of "just following up" or "just wanted to check in" — those phrases are dead on arrival and you know it. Open with a reason, not a throat-clear.
- ZERO exclamation marks.
- Body under 200 words. Every sentence earns its place.
- Contractions are fine in "warm" tone, fewer in "formal", sparing in "direct".
- No emoji. No "I hope this finds you well."

TONE SELECTION (based on contact warmth):
- No contact or warmth < 30 → "formal": third-person indirect address, institutional register, no first names.
- warmth 30–70 → "direct": second-person, short sentences, action-forward, no preamble.
- warmth > 70 → "warm": first-name address if available, reference the prior exchange implicitly, keep the thread alive without begging.

STRUCTURE:
- subject: under 60 chars. Specific to the role or company or moment. Never "Follow-up" or "Checking in".
- body: 2–3 short paragraphs. First line opens with a reason to be writing (a deadline, a relevant update from the candidate's side, a specific signal from the role). Close with one concrete ask (a coffee, a quick call, a yes/no).
- tone: the tone you chose above.

Output structured JSON matching the schema exactly — subject, body, tone.`;

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------
/**
 * Generate a follow-up draft for a single stale application.
 *
 * The prompt includes company, role, days-since-activity, and (when known)
 * the contact name + warmth so the LLM can tune tone. Returns the typed
 * object; callers persist `subject`, `body`, and store `tone` in metadata.
 */
export async function generateFollowUpDraft(
  input: FollowUpDraftInput,
): Promise<FollowUpDraft> {
  const contactLine = input.contactName
    ? `Contact: ${input.contactName}`
    : "Contact: unknown (no named contact on this application)";
  const warmthLine =
    typeof input.contactWarmth === "number"
      ? `Contact warmth: ${input.contactWarmth}/100`
      : "Contact warmth: unknown";

  const prompt = [
    `Draft an overnight follow-up from the candidate to ${input.company} about the ${input.role} role.`,
    `Days since last activity on this application: ${input.daysSinceActivity}.`,
    contactLine,
    warmthLine,
    "",
    "Pick the tone that fits the warmth signal. Open with a reason — never 'just following up'. One clear ask at the close.",
  ].join("\n");

  const { object } = await generateObject({
    model: getAgentModel(),
    schema: FollowUpDraftSchema,
    system: SYSTEM_PROMPT,
    prompt,
  });

  return object;
}
