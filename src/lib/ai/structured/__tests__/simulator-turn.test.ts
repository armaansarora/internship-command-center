/**
 * R10.13 — simulator-turn helper contract tests.
 *
 * Stubs `ai.generateObject` so no network call runs. Tests verify:
 *   - the mocked structured object round-trips through
 *   - shape parses through the Zod schema (scoring nullable on round 0)
 *   - the prompt carries the offer, stance, and history
 *   - the system prompt includes the 5-10% opener instruction and bans cliches
 *   - the recruiter reply integer is anchored on offer.base (prompt instruction)
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("ai", () => ({
  generateObject: vi.fn(async () => ({
    object: {
      recruiterReply:
        "We're prepared to bring you on at $170,000 base. There's also room for a signing bonus.",
      scoring: null,
    },
    usage: { inputTokens: 30, outputTokens: 40 },
  })),
}));

vi.mock("@/lib/ai/model", () => ({
  getAgentModel: () => null,
}));

import { simulateTurn } from "../simulator-turn";
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
    base: 180000,
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

describe("R10.13 simulateTurn", () => {
  it("returns a recruiter reply and nullable scoring", async () => {
    const out = await simulateTurn({
      userFirstName: "Armaan",
      offer: makeOffer(),
      stance: { anchor: 185000, flex: 5000, walkaway: 170000 },
      history: [],
      userReply: null,
    });
    expect(out.recruiterReply.length).toBeGreaterThan(10);
    expect(out.scoring).toBeNull();
  });

  it("prompt carries offer, stance, and history", async () => {
    const { generateObject } = await import("ai");
    const mock = vi.mocked(generateObject);
    mock.mockClear();

    await simulateTurn({
      userFirstName: "Armaan",
      offer: makeOffer({
        company_name: "Globex",
        role: "Trader",
        base: 220000,
      }),
      stance: { anchor: 230000, flex: 10000, walkaway: 210000 },
      history: [
        { role: "recruiter", text: "We can offer $205k." },
        { role: "user", text: "I was thinking more like $230k." },
      ],
      userReply: "I was thinking more like $230k.",
    });

    expect(mock).toHaveBeenCalledOnce();
    const call = mock.mock.calls[0]![0] as unknown as {
      prompt: string;
      system: string;
    };
    expect(call.prompt).toContain("Globex");
    expect(call.prompt).toContain("Trader");
    expect(call.prompt).toContain("220000");
    expect(call.prompt).toContain("230000");
    expect(call.prompt).toContain("210000");
    expect(call.prompt).toContain("205k");
  });

  it("system prompt anchors on userFirstName, bans cliches, and instructs 5-10% opener", async () => {
    const { generateObject } = await import("ai");
    const mock = vi.mocked(generateObject);
    mock.mockClear();

    await simulateTurn({
      userFirstName: "Armaan",
      offer: makeOffer({ base: 180000 }),
      stance: { anchor: 185000, flex: 5000, walkaway: 170000 },
      history: [],
      userReply: null,
    });

    const call = mock.mock.calls[0]![0] as unknown as { system: string };
    expect(call.system).toContain("Armaan");
    expect(call.system.toLowerCase()).toContain("i hope this email finds you well");
    expect(call.system).toMatch(/5.*10%/);
    expect(call.system).toContain("180000");
  });
});
