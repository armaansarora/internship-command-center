/**
 * R10.9 — negotiation-draft helper contract tests.
 *
 * Stubs `ai.generateObject` so no network call runs; `getAgentModel()` stays
 * live but receives a null model (acceptable because the real `generateObject`
 * never runs). Tests verify:
 *   - the mocked structured object round-trips through
 *   - the returned shape parses through the Zod schema
 *   - the prompt carries offer JSON (company, role, comp) and the convening
 *     JSON (or the literal `null` when the caller passes `null` through)
 *   - the system prompt bans boilerplate openers ("I hope this email finds
 *     you well") and anchors on the user's first name.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("ai", () => ({
  generateObject: vi.fn(async () => ({
    object: {
      subject: "RE: Acme offer",
      body: "Hi Jane, I'd love to discuss the Analyst offer you extended. Based on the market data we reviewed, the base is a touch below comparable NYC roles — is there room to revisit that number? Happy to discuss Friday. Best, Armaan",
    },
    usage: { inputTokens: 20, outputTokens: 40 },
  })),
}));

vi.mock("@/lib/ai/model", () => ({
  getAgentModel: () => null,
}));

import { draftNegotiationEmail } from "../negotiation-draft";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

function makeOffer(overrides: Partial<OfferRow> = {}): OfferRow {
  return {
    id: "o1",
    user_id: "u1",
    application_id: null,
    company_name: "Acme",
    role: "Analyst",
    level: null,
    location: "NYC",
    base: 90000,
    bonus: 0,
    equity: 0,
    sign_on: 0,
    housing: 0,
    start_date: null,
    benefits: {},
    received_at: "2026-04-23T00:00:00.000Z",
    deadline_at: null,
    status: "received",
    created_at: "2026-04-23T00:00:00.000Z",
    updated_at: "2026-04-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("R10.9 draftNegotiationEmail", () => {
  it("returns subject + body conforming to the schema", async () => {
    const out = await draftNegotiationEmail({
      userFirstName: "Armaan",
      offer: makeOffer(),
      convening: null,
    });
    expect(out.subject).toMatch(/acme/i);
    expect(out.body.length).toBeGreaterThan(5);
  });

  it("prompt carries offer JSON and the literal 'null' when convening is null", async () => {
    const { generateObject } = await import("ai");
    const mock = vi.mocked(generateObject);
    mock.mockClear();

    await draftNegotiationEmail({
      userFirstName: "Armaan",
      offer: makeOffer({ company_name: "Globex", role: "Trader", base: 125000 }),
      convening: null,
    });

    expect(mock).toHaveBeenCalledOnce();
    const firstCall = mock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const call = firstCall![0] as unknown as { prompt: string; system: string };
    expect(call.prompt).toContain("Globex");
    expect(call.prompt).toContain("Trader");
    expect(call.prompt).toContain("125000");
    // Convening is null → JSON.stringify(null) === "null".
    expect(call.prompt).toContain("CONVENING:\nnull");
  });

  it("prompt carries convening JSON when provided", async () => {
    const { generateObject } = await import("ai");
    const mock = vi.mocked(generateObject);
    mock.mockClear();

    await draftNegotiationEmail({
      userFirstName: "Armaan",
      offer: makeOffer(),
      // Cast because ParlorConveningResult shape is re-exported for typing only.
      convening: {
        offer_evaluator: {
          verdict: "UNDER",
          narrative: "Below market",
          risks: [],
        },
        cfo: {
          total_comp_year1: 90000,
          total_comp_4yr: 360000,
          vesting_note: "",
          narrative: "",
        },
        cno: { contacts_at_company: [], narrative: "" },
      } as never,
    });

    expect(mock).toHaveBeenCalledOnce();
    const firstCall = mock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const call = firstCall![0] as unknown as { prompt: string };
    expect(call.prompt).toContain("UNDER");
    expect(call.prompt).toContain("Below market");
  });

  it("system prompt bans boilerplate openers and anchors on the user's first name", async () => {
    const { generateObject } = await import("ai");
    const mock = vi.mocked(generateObject);
    mock.mockClear();

    await draftNegotiationEmail({
      userFirstName: "Armaan",
      offer: makeOffer(),
      convening: null,
    });

    const firstCall = mock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const call = firstCall![0] as unknown as { system: string };
    expect(call.system).toContain("Armaan");
    expect(call.system.toLowerCase()).toContain("i hope this email finds you well");
  });
});
