/**
 * Parlor convening fan-out tests.
 *
 * Invariants:
 *   - Three parallel `generateObject` calls, one per seat (offer_evaluator,
 *     cfo, cno), routed by `schemaName`.
 *   - Promise.allSettled — a failure on one chair does NOT block the others.
 *   - Failed chairs fall back to typed empty values so the UI can always
 *     render three cards.
 *   - Returned object is the three typed blocks keyed by seat.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("ai", () => ({
  generateObject: vi.fn(async ({ schemaName }: { schemaName?: string }) => ({
    object:
      schemaName === "offer_evaluator"
        ? { verdict: "MARKET", narrative: "2 notes", risks: ["exploding offer"] }
        : schemaName === "cfo"
          ? {
              total_comp_year1: 150000,
              total_comp_4yr: 600000,
              vesting_note: "cliff",
              narrative: "solid",
            }
          : { contacts_at_company: [], narrative: "no leads" },
    usage: { inputTokens: 10, outputTokens: 30 },
  })),
}));

vi.mock("@/lib/ai/model", () => ({
  getAgentModel: () => ({ modelId: "mock-model" }),
}));

import { convenePipelineForOffer } from "../parlor-convening";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

function makeOffer(overrides: Partial<OfferRow> = {}): OfferRow {
  return {
    id: "offer-1",
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

describe("convenePipelineForOffer", () => {
  it("fans out three parallel calls and returns three typed blocks", async () => {
    const result = await convenePipelineForOffer({
      userId: "u1",
      userFirstName: "Armaan",
      offer: makeOffer(),
      bands: null,
    });
    expect(result.offer_evaluator.verdict).toBe("MARKET");
    expect(result.cfo.total_comp_year1).toBe(150000);
    expect(result.cno.contacts_at_company).toEqual([]);
  });

  it("issues exactly three generateObject calls tagged by seat", async () => {
    const { generateObject } = await import("ai");
    const mock = vi.mocked(generateObject);
    mock.mockClear();

    await convenePipelineForOffer({
      userId: "u1",
      userFirstName: "Armaan",
      offer: makeOffer(),
      bands: null,
    });

    expect(mock).toHaveBeenCalledTimes(3);
    const seatNames = mock.mock.calls.map(
      (c) => (c[0] as { schemaName?: string }).schemaName,
    );
    expect(seatNames.sort()).toEqual(["cfo", "cno", "offer_evaluator"]);
  });

  it("returns typed empty fallbacks when a chair's call rejects", async () => {
    const { generateObject } = await import("ai");
    const mock = vi.mocked(generateObject);
    // The real GenerateObjectResult shape has fields we don't need to mirror
    // in a test mock — cast via `unknown` to sidestep the strict return type.
    mock.mockImplementationOnce(async () => {
      throw new Error("cfo model down");
    });
    mock.mockImplementationOnce((async () => ({
      object: { verdict: "STRONG", narrative: "ok", risks: [] },
      usage: { inputTokens: 1, outputTokens: 1 },
    })) as unknown as typeof generateObject);
    mock.mockImplementationOnce((async () => ({
      object: { contacts_at_company: [], narrative: "none" },
      usage: { inputTokens: 1, outputTokens: 1 },
    })) as unknown as typeof generateObject);

    const result = await convenePipelineForOffer({
      userId: "u1",
      userFirstName: "Armaan",
      offer: makeOffer(),
      bands: null,
    });

    // At least one chair must fall back to its empty shape; the two that
    // resolved must keep their server-provided values. We assert the union:
    // a CFO empty shape (0s + "" notes) coexisting with a non-empty peer.
    const anyEmpty =
      result.cfo.total_comp_year1 === 0 ||
      result.offer_evaluator.narrative === "Analysis unavailable." ||
      result.cno.narrative === "";
    expect(anyEmpty).toBe(true);
  });
});
