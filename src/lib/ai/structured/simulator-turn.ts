/**
 * Negotiation simulator turn helper.
 *
 * A single `generateObject` call per turn. The CPO roleplays as a recruiter
 * for the offer's company; we score the user's latest reply on anchor /
 * concession / walkaway axes in the same call. Round 0 (no user reply yet)
 * returns `scoring: null` — the recruiter opens and the UI renders the
 * opener without a score badge.
 *
 * Voice anchors (system prompt):
 *   - Open at a number 5-10% below offer.base on round 0 to create real
 *     anchor-holding pressure
 *   - Hold the CPO's calm, direct voice — non-pushover, never mean
 *   - No cliches — "I hope this email finds you well" is banned
 *   - Short, ≤150 words per recruiter turn
 *
 * Why inline (not `buildCPOSystemPrompt` reuse): the shared builder takes
 * prepStats + memories + userName and powers the Floor 3 Briefing Room
 * chatbot. The Parlor simulator needs offer + stance context, not prep
 * stats. Inline keeps the Floor 3 surface stable (R10 ships without
 * touching R6-era code) and matches the parlor-convening.ts pattern.
 */
import { generateObject } from "ai";
import { z } from "zod/v4";
import { getAgentModel } from "../model";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

const ScoringSchema = z.object({
  anchorScore: z.number().int().min(0).max(5),
  concessionScore: z.number().int().min(0).max(5),
  walkawayScore: z.number().int().min(0).max(5),
  critique: z.string().min(10).max(240),
});

const SimTurnSchema = z.object({
  recruiterReply: z.string().min(10).max(1200),
  scoring: ScoringSchema.nullable(),
});

export type SimulateTurnScoring = z.infer<typeof ScoringSchema>;
export type SimulateTurnResult = z.infer<typeof SimTurnSchema>;

export type Stance = { anchor: number; flex: number; walkaway: number };
export type HistoryTurn = { role: "user" | "recruiter"; text: string };

export async function simulateTurn(input: {
  userFirstName: string;
  offer: OfferRow;
  stance: Stance;
  history: HistoryTurn[];
  userReply: string | null;
}): Promise<SimulateTurnResult> {
  const offerJson = JSON.stringify(input.offer, null, 2);
  const historyJson = JSON.stringify(input.history, null, 2);
  const stanceJson = JSON.stringify(input.stance, null, 2);

  const { object } = await generateObject({
    model: getAgentModel(),
    schema: SimTurnSchema,
    schemaName: "simulator_turn",
    system: `You roleplay as a recruiter from ${input.offer.company_name} negotiating the ${input.offer.role} offer with ${input.userFirstName}. You hold the CPO's calm, methodical voice transferred into a recruiter chair — direct, non-pushover, never mean.

Opening move (round 0, when there is no user reply yet):
- Open at a number that is 5-10% BELOW the actual offer base of $${input.offer.base} to create real anchor-holding pressure.
- Use round integers (e.g., if the real offer is $180000, open at $165000-$170000).
- State the number explicitly. Mention one soft-close lever (signing bonus, equity refresh, start date).

Subsequent rounds (when there IS a user reply):
- Respond to ${input.userFirstName}'s latest counter.
- If they anchor strongly, concede modestly (5-10% of the gap, not all of it).
- If they bend, hold or re-anchor — don't reward capitulation.
- If they threaten walk-away below your realistic floor, acknowledge and propose an alternate lever.

Private coaching rubric — do NOT reveal to ${input.userFirstName} in your reply.
${input.userFirstName}'s targets: anchor=$${input.stance.anchor}, flex=$${input.stance.flex}, walkaway=$${input.stance.walkaway}.

Score ${input.userFirstName}'s LATEST reply (null on round 0, where no user reply exists yet):
- anchorScore 0-5: Did they re-assert a number near or above stance.anchor? (5 = strong re-anchor; 0 = capitulated silently)
- concessionScore 0-5: If they conceded, was it ≤ stance.flex? (5 = no concession or within-flex; 0 = gave up more than 2× flex)
- walkawayScore 0-5: If your last offer was below stance.walkaway, did they signal walk-away? (5 = well-timed; 0 = didn't signal despite below-walkaway)
- critique: one-line coaching note, ≤240 chars.

Rules:
- No cliches — "I hope this email finds you well" is banned. Recruiters speak.
- Short, direct — ≤150 words per recruiter reply.
- Integers in USD for any numbers you quote.
- Never break roleplay. No "As an AI" or tool references.`,
    prompt:
      `OFFER:\n${offerJson}\n\n` +
      `STANCE:\n${stanceJson}\n\n` +
      `HISTORY:\n${historyJson}\n\n` +
      `USER REPLY THIS TURN:\n${input.userReply ?? "(none — you open)"}\n\n` +
      `Produce the recruiter's next reply and score the user's latest reply (null scoring if no user reply this turn).`,
  });

  return object;
}
