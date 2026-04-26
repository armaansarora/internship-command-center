/**
 * Offer Evaluator system prompt tests.
 *
 * The Offer Evaluator is a new CRO subagent seated in the Negotiation
 * Parlor. Unlike the full-pipeline CRO which weighs the funnel, the
 * Evaluator weighs a single offer against market bands. Assessment only:
 * no drafting, no negotiating, no email copy. Short sentences; cited
 * numbers; a one-word verdict up top.
 */
import { describe, it, expect } from "vitest";
import { buildOfferEvaluatorSystemPrompt } from "../system-prompt";

describe("OfferEvaluator system prompt", () => {
  it("embeds hard rules about numbers + brevity", () => {
    const p = buildOfferEvaluatorSystemPrompt({ userFirstName: "Armaan" });
    expect(p).toMatch(/offer evaluator/i);
    expect(p).toMatch(/concise|brief|under \d+ words/i);
    expect(p).toMatch(/never.*boilerplate|do not.*boilerplate/i);
    expect(p).toMatch(/armaan/i);
  });

  it("lists the 4 verdict tokens", () => {
    const p = buildOfferEvaluatorSystemPrompt({ userFirstName: "Armaan" });
    expect(p).toMatch(/STRONG/);
    expect(p).toMatch(/MARKET/);
    expect(p).toMatch(/UNDER/);
    expect(p).toMatch(/THIN_DATA/);
  });

  it("interpolates a different user name", () => {
    const p = buildOfferEvaluatorSystemPrompt({ userFirstName: "Jordan" });
    expect(p).toMatch(/jordan/i);
    expect(p).not.toMatch(/\{userFirstName\}/);
  });
});
