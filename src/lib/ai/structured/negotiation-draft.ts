/**
 * R10.9 — Negotiation-email draft generator.
 *
 * The Negotiation Parlor's final beat: once the three chairs have convened
 * and the comp band chart has pinned the offer, the Offer Evaluator drafts
 * the negotiation email. One `generateObject` call, a tight Zod shape, no
 * streaming — the UI simulates the pen-glow reveal locally (R5.4's
 * scaffolding reused, not rebuilt).
 *
 * Voice anchors (system prompt):
 *   - NEVER generic or boilerplate. If you'd put "I hope this email finds
 *     you well" in, cut it.
 *   - Specific, grounded in the offer's own numbers.
 *   - A clear counter anchored in market data if bands are available.
 *   - A single clean ask at the close. No ultimatums.
 *
 * Callers: POST /api/offers/[id]/negotiation-draft
 *   → inserts the returned {subject, body} into `outreach_queue` as
 *   `type='negotiation'`, `status='pending_approval'`, `generated_by='offer_evaluator'`,
 *   `metadata: { offer_id }`. The Writing Room's existing approve/send flow
 *   picks the row up from there.
 */
import { generateObject } from "ai";
import { z } from "zod/v4";
import { getAgentModel } from "../model";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import type { ParlorConveningResult } from "@/lib/ai/agents/parlor-convening";

const DraftSchema = z.object({
  subject: z.string().min(3).max(120),
  body: z.string().min(40).max(4000),
});

export type NegotiationDraft = z.infer<typeof DraftSchema>;

export async function draftNegotiationEmail(input: {
  userFirstName: string;
  offer: OfferRow;
  convening: ParlorConveningResult | null;
}): Promise<NegotiationDraft> {
  const conveningJson = input.convening
    ? JSON.stringify(input.convening, null, 2)
    : "null";
  const offerJson = JSON.stringify(input.offer, null, 2);

  const { object } = await generateObject({
    model: getAgentModel(),
    schema: DraftSchema,
    schemaName: "negotiation_draft",
    system: `You write a negotiation email on behalf of ${input.userFirstName}.
Rules:
- NEVER generic or boilerplate. If you'd put "I hope this email finds you well" in, cut it.
- Specific, grounded in the offer's own numbers.
- A clear counter anchored in market data if bands are available.
- A single clean ask at the close. No ultimatums.
- Max 200 words body. Subject short, specific, not clickbait.
- Never sign off with anything cliche ("Best," is fine).`,
    prompt:
      `OFFER:\n${offerJson}\n\nCONVENING:\n${conveningJson}\n\n` +
      `Draft the negotiation email. If comp bands are thin, negotiate on terms ` +
      `(start date, signing, equity refresh) instead of base.`,
  });
  return object;
}
