/**
 * R10.7 — POST /api/offers/[id]/convene contract tests.
 *
 * Invariants:
 *   - 401 when unauthenticated; no DB, no model, no bands lookup.
 *   - 404 when the offer doesn't exist (or isn't owned by the user).
 *   - 200 with `{ result, bands }` on happy path; all three seats resolve.
 *   - `convenePipelineForOffer` is called with the resolved offer and bands
 *     (passes `bands` when `ok:true`, `null` otherwise — MVP contract).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import type { LookupResult } from "@/lib/comp-bands/lookup";

const {
  requireUserSpy,
  getOfferByIdSpy,
  convenePipelineSpy,
  lookupBandsSpy,
  getSupabaseAdminSpy,
} = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  getOfferByIdSpy: vi.fn(),
  convenePipelineSpy: vi.fn(),
  lookupBandsSpy: vi.fn(),
  getSupabaseAdminSpy: vi.fn(() => ({ __admin: true })),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ __client: true }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminSpy,
}));

vi.mock("@/lib/db/queries/offers-rest", () => ({
  getOfferById: getOfferByIdSpy,
}));

vi.mock("@/lib/ai/agents/parlor-convening", () => ({
  convenePipelineForOffer: convenePipelineSpy,
}));

vi.mock("@/lib/comp-bands/lookup", () => ({
  lookupCompBands: lookupBandsSpy,
}));

const { POST } = await import("./route");

const OFFER_ID = "22222222-2222-4222-8222-222222222222";

const OK_AUTH = {
  ok: true as const,
  user: { id: "user-xyz", email: "owner@example.com" },
};

function offerRow(overrides: Partial<OfferRow> = {}): OfferRow {
  return {
    id: OFFER_ID,
    user_id: "user-xyz",
    application_id: null,
    company_name: "Acme",
    role: "Analyst",
    level: null,
    location: "NYC",
    base: 100000,
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

function bandsOk(): LookupResult {
  return {
    ok: true,
    base: { p25: 80000, p50: 100000, p75: 120000 },
    bonus: { p25: 0, p50: 5000, p75: 15000 },
    equity: { p25: 0, p50: 10000, p75: 25000 },
    sampleSize: 42,
    source: "levels.fyi",
    fromCache: true,
  };
}

function callPost(): Promise<Response> {
  const req = new Request(
    `http://localhost/api/offers/${OFFER_ID}/convene`,
    { method: "POST" },
  );
  return POST(req, { params: Promise.resolve({ id: OFFER_ID }) });
}

beforeEach(() => {
  requireUserSpy.mockReset();
  getOfferByIdSpy.mockReset();
  convenePipelineSpy.mockReset();
  lookupBandsSpy.mockReset();
});

describe("POST /api/offers/[id]/convene", () => {
  it("returns 401 when unauthenticated and never calls the pipeline", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await callPost();
    expect(res.status).toBe(401);
    expect(getOfferByIdSpy).not.toHaveBeenCalled();
    expect(convenePipelineSpy).not.toHaveBeenCalled();
    expect(lookupBandsSpy).not.toHaveBeenCalled();
  });

  it("returns 404 when the offer doesn't exist", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    getOfferByIdSpy.mockResolvedValue(null);

    const res = await callPost();
    expect(res.status).toBe(404);
    expect(convenePipelineSpy).not.toHaveBeenCalled();
  });

  it("returns 200 with result + bands on happy path (bands ok → passed through)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    const offer = offerRow();
    getOfferByIdSpy.mockResolvedValue(offer);
    const bands = bandsOk();
    lookupBandsSpy.mockResolvedValue(bands);
    convenePipelineSpy.mockResolvedValue({
      offer_evaluator: { verdict: "MARKET", narrative: "ok", risks: [] },
      cfo: {
        total_comp_year1: 110000,
        total_comp_4yr: 440000,
        vesting_note: "",
        narrative: "",
      },
      cno: { contacts_at_company: [], narrative: "" },
    });

    const res = await callPost();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: { offer_evaluator: { verdict: string } };
      bands: LookupResult;
    };
    expect(body.result.offer_evaluator.verdict).toBe("MARKET");
    expect(body.bands).toEqual(bands);

    // convenePipeline sees the offer and the bands payload (bands.ok passed through)
    expect(convenePipelineSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-xyz",
        offer,
        bands,
      }),
    );
  });

  it("passes bands=null to the pipeline when lookup returns ok:false", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    const offer = offerRow();
    getOfferByIdSpy.mockResolvedValue(offer);
    lookupBandsSpy.mockResolvedValue({ ok: false, reason: "no_key" });
    convenePipelineSpy.mockResolvedValue({
      offer_evaluator: { verdict: "THIN_DATA", narrative: "no bands", risks: [] },
      cfo: {
        total_comp_year1: 100000,
        total_comp_4yr: 400000,
        vesting_note: "",
        narrative: "",
      },
      cno: { contacts_at_company: [], narrative: "" },
    });

    const res = await callPost();
    expect(res.status).toBe(200);
    expect(convenePipelineSpy).toHaveBeenCalledWith(
      expect.objectContaining({ bands: null }),
    );
  });
});
