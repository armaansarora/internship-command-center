/**
 * The three-chair convening.
 *
 * Fans an offer out to three seats in parallel:
 *
 *   - Offer Evaluator (new CRO subagent) — one-word verdict + narrative + risks.
 *   - CFO (Parlor-scoped) — computes year-1 + 4yr totals, vesting note.
 *   - CNO (Parlor-scoped) — surfaces contacts at the company (or none).
 *
 * Why parallel: the Parlor's emotional beat is "the three lean in." Each
 * chair speaks in its own voice; none waits on another. We use
 * `Promise.allSettled` so a single chair's failure (rate limit, schema
 * rejection, transient provider error) never blackouts the whole panel.
 *
 * Why inline CFO/CNO prompts (instead of reusing `buildCFOSystemPrompt`
 * and `buildCNOSystemPrompt` from `@/lib/agents/*`): those builders are
 * stat-heavy full-pipeline prompts wired for `/api/cfo` and `/api/cno`.
 * The Parlor needs offer-scoped, brief, assessment-only voices. Keeping
 * the convening prompts local here keeps the existing builders stable
 * for their Floor 2 / Floor 6 callers (R10 ships without touching
 * era code).
 *
 * MVP-scope notes:
 *   - No `recordAgentRun` telemetry yet. `agent_dispatches` writes land in
 *     a follow-up; the schema already supports the triad.
 *   - Each seat sees the same offer + bands JSON; individual prompts append
 *     seat-specific instructions (CFO computes totals, CNO lists contacts).
 */

import { generateObject } from "ai";
import { z } from "zod/v4";
import { getAgentModel } from "../model";
import { buildOfferEvaluatorSystemPrompt } from "@/lib/agents/offer-evaluator/system-prompt";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import type { LookupResult } from "@/lib/comp-bands/lookup";

// ---------------------------------------------------------------------------
// Seat schemas — the typed contract the UI binds against.
// ---------------------------------------------------------------------------
const OfferEvalSchema = z.object({
  verdict: z.enum(["STRONG", "MARKET", "UNDER", "THIN_DATA"]),
  narrative: z.string(),
  risks: z.array(z.string()).max(6),
});

const CFOSchema = z.object({
  total_comp_year1: z.number().int(),
  total_comp_4yr: z.number().int(),
  vesting_note: z.string(),
  narrative: z.string(),
});

const CNOSchema = z.object({
  contacts_at_company: z.array(
    z.object({
      name: z.string(),
      warmth: z.number().int(),
      note: z.string(),
    }),
  ),
  narrative: z.string(),
});

export type OfferEvaluatorBlock = z.infer<typeof OfferEvalSchema>;
export type CFOBlock = z.infer<typeof CFOSchema>;
export type CNOBlock = z.infer<typeof CNOSchema>;

export type ParlorConveningResult = {
  offer_evaluator: OfferEvaluatorBlock;
  cfo: CFOBlock;
  cno: CNOBlock;
};

// ---------------------------------------------------------------------------
// Parlor-scoped CFO + CNO voices. These live here (not in the shared agent
// prompts) because they're assessment-only and offer-bound — see module docblock.
// ---------------------------------------------------------------------------
function buildParlorCFOSystemPrompt(userFirstName: string): string {
  return `You are the CFO of The Tower, seated in the Negotiation Parlor alongside the Offer Evaluator and the CNO.
You speak to ${userFirstName} in tight, data-dense sentences.

Your one job in this room: compute the offer's total compensation. Year 1
and 4-year. Standard 4-year vesting with a 1-year cliff unless the offer
says otherwise.

Rules:
- Return integers in USD. No ranges.
- Be concise. No boilerplate. Never produce generic "you should consider..." language.
- If equity is granted, note the cliff + vesting shape in vesting_note.
- If a number is missing from the offer, treat it as 0 and move on.
- You do not draft emails. You do not negotiate. You compute.`;
}

function buildParlorCNOSystemPrompt(userFirstName: string): string {
  return `You are the CNO of The Tower, seated in the Negotiation Parlor alongside the Offer Evaluator and the CFO.
You speak to ${userFirstName} warmly and briefly.

Your one job in this room: surface any contacts the user already has at
the offering company. If they have none, say so plainly.

Rules:
- Return the list; do not invent names.
- Be concise. No boilerplate. Never produce generic "you should consider..." language.
- warmth is 0-100 (100 = warmest).
- A one-line note per contact — last interaction context or why they matter.
- You do not draft emails. You do not negotiate. You orient.`;
}

// ---------------------------------------------------------------------------
// Empty fallbacks — used when a seat's call rejects so the UI always has a
// three-card surface to render.
// ---------------------------------------------------------------------------
const EMPTY_OFFER_EVAL: OfferEvaluatorBlock = {
  verdict: "THIN_DATA",
  narrative: "Analysis unavailable.",
  risks: [],
};
const EMPTY_CFO: CFOBlock = {
  total_comp_year1: 0,
  total_comp_4yr: 0,
  vesting_note: "",
  narrative: "",
};
const EMPTY_CNO: CNOBlock = {
  contacts_at_company: [],
  narrative: "",
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export async function convenePipelineForOffer(input: {
  userId: string;
  userFirstName: string;
  offer: OfferRow;
  bands: LookupResult | null;
}): Promise<ParlorConveningResult> {
  const offerJson = JSON.stringify(input.offer, null, 2);
  const bandsJson = JSON.stringify(input.bands, null, 2);
  const promptShared =
    `A new offer has arrived. Analyze this offer for ${input.userFirstName}.\n` +
    `OFFER:\n${offerJson}\n\nCOMP BANDS:\n${bandsJson}\n`;
  const model = getAgentModel();

  const [oe, cfo, cno] = await Promise.allSettled([
    generateObject({
      model,
      schema: OfferEvalSchema,
      schemaName: "offer_evaluator",
      system: buildOfferEvaluatorSystemPrompt({
        userFirstName: input.userFirstName,
      }),
      prompt: promptShared,
    }),
    generateObject({
      model,
      schema: CFOSchema,
      schemaName: "cfo",
      system: buildParlorCFOSystemPrompt(input.userFirstName),
      prompt:
        promptShared +
        `\nCompute total_comp_year1 and total_comp_4yr assuming standard 4-year vesting with 1yr cliff. Return integers in USD.`,
    }),
    generateObject({
      model,
      schema: CNOSchema,
      schemaName: "cno",
      system: buildParlorCNOSystemPrompt(input.userFirstName),
      prompt:
        promptShared +
        `\nReturn contacts the user already has at "${input.offer.company_name}". If you don't know, return [].`,
    }),
  ]);

  return {
    offer_evaluator: oe.status === "fulfilled" ? oe.value.object : EMPTY_OFFER_EVAL,
    cfo: cfo.status === "fulfilled" ? cfo.value.object : EMPTY_CFO,
    cno: cno.status === "fulfilled" ? cno.value.object : EMPTY_CNO,
  };
}
