/**
 * POST /api/offers/[id]/negotiation-draft contract tests.
 *
 * Invariants:
 *   - 401 when unauthenticated; no DB touched, no draft generated.
 *   - 404 when the offer doesn't exist (or isn't owned by the user).
 *   - 500 when the outreach_queue insert fails (the draft still generated
 *     — we surface the DB error rather than swallowing it).
 *   - 200 with `{ outreach: {...} }` on happy path.
 *   - The inserted row carries type='negotiation',
 *     status='pending_approval', generated_by='offer_evaluator', and
 *     metadata.offer_id === offer.id.
 *   - `draftNegotiationEmail` sees the resolved offer and the pass-through
 *     convening (null when body is empty, the object when body carries it).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

const {
  requireUserSpy,
  getOfferByIdSpy,
  draftNegotiationEmailSpy,
  insertRowCaptureSpy,
} = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  getOfferByIdSpy: vi.fn(),
  draftNegotiationEmailSpy: vi.fn(),
  insertRowCaptureSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

/**
 * Test-only supabase client that gives us a fluent insert().select().single()
 * surface. The insert body is captured via `insertRowCaptureSpy` so we can
 * assert on it; the single() return shape is controlled per-test via
 * `singleResult`.
 */
let singleResult: { data: unknown; error: { message: string } | null } = {
  data: null,
  error: null,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (_table: string) => ({
      insert: (row: unknown) => {
        insertRowCaptureSpy(row);
        return {
          select: (_sel: string) => ({
            single: async () => singleResult,
          }),
        };
      },
    }),
  }),
}));

vi.mock("@/lib/db/queries/offers-rest", () => ({
  getOfferById: getOfferByIdSpy,
}));

vi.mock("@/lib/ai/structured/negotiation-draft", () => ({
  draftNegotiationEmail: draftNegotiationEmailSpy,
}));

interface QuotaResultLike {
  allowed: boolean;
  used: number;
  cap: number;
  reason?: "exceeded" | "rpc_error";
}
const consumeAiQuotaSpy = vi.hoisted(() =>
  vi.fn<(userId: string, tier: string) => Promise<QuotaResultLike>>(
    async () => ({ allowed: true, used: 1, cap: 25 }),
  ),
);
vi.mock("@/lib/ai/quota", () => ({
  consumeAiQuota: consumeAiQuotaSpy,
}));
vi.mock("@/lib/stripe/entitlements", () => ({
  getUserTier: vi.fn(async () => "free"),
}));

const { POST } = await import("./route");

const OFFER_ID = "33333333-3333-4333-8333-333333333333";

const OK_AUTH = {
  ok: true as const,
  user: { id: "user-neg", email: "owner@example.com" },
};

function offerRow(overrides: Partial<OfferRow> = {}): OfferRow {
  return {
    id: OFFER_ID,
    user_id: "user-neg",
    application_id: "app-1",
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

function callPost(body?: unknown): Promise<Response> {
  const req = new Request(
    `http://localhost/api/offers/${OFFER_ID}/negotiation-draft`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
  );
  return POST(req, { params: Promise.resolve({ id: OFFER_ID }) });
}

beforeEach(() => {
  requireUserSpy.mockReset();
  getOfferByIdSpy.mockReset();
  draftNegotiationEmailSpy.mockReset();
  insertRowCaptureSpy.mockReset();
  consumeAiQuotaSpy.mockReset();
  consumeAiQuotaSpy.mockResolvedValue({ allowed: true, used: 1, cap: 25 });
  singleResult = { data: null, error: null };
});

describe("POST /api/offers/[id]/negotiation-draft", () => {
  it("returns 401 when unauthenticated and never drafts / queries offers", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    });

    const res = await callPost({});
    expect(res.status).toBe(401);
    expect(getOfferByIdSpy).not.toHaveBeenCalled();
    expect(draftNegotiationEmailSpy).not.toHaveBeenCalled();
    expect(insertRowCaptureSpy).not.toHaveBeenCalled();
  });

  it("returns 404 when the offer doesn't exist", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    getOfferByIdSpy.mockResolvedValue(null);

    const res = await callPost({});
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("not_found");
    expect(draftNegotiationEmailSpy).not.toHaveBeenCalled();
    expect(insertRowCaptureSpy).not.toHaveBeenCalled();
  });

  it("returns 500 when the outreach_queue insert fails", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    getOfferByIdSpy.mockResolvedValue(offerRow());
    draftNegotiationEmailSpy.mockResolvedValue({
      subject: "RE: Acme offer",
      body: "Hi team, I'd like to discuss the Analyst offer...",
    });
    singleResult = {
      data: null,
      error: { message: "insert blew up" },
    };

    const res = await callPost({});
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("insert blew up");
  });

  it("returns 200 with the inserted outreach on happy path (convening=null)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    const offer = offerRow();
    getOfferByIdSpy.mockResolvedValue(offer);
    draftNegotiationEmailSpy.mockResolvedValue({
      subject: "RE: Acme offer",
      body: "Hi team, I'd like to discuss the Analyst offer...",
    });
    singleResult = {
      data: {
        id: "ot-1",
        user_id: "user-neg",
        application_id: "app-1",
        type: "negotiation",
        subject: "RE: Acme offer",
        body: "Hi team, I'd like to discuss the Analyst offer...",
        status: "pending_approval",
        generated_by: "offer_evaluator",
        metadata: { offer_id: OFFER_ID },
      },
      error: null,
    };

    const res = await callPost({});
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      outreach: { id: string; type: string; status: string };
    };
    expect(body.outreach.id).toBe("ot-1");
    expect(body.outreach.type).toBe("negotiation");
    expect(body.outreach.status).toBe("pending_approval");

    // draftNegotiationEmail sees the resolved offer and a null convening.
    expect(draftNegotiationEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        offer,
        convening: null,
      }),
    );

    // Inserted row carries the R10.9 semantics.
    expect(insertRowCaptureSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-neg",
        application_id: "app-1",
        type: "negotiation",
        status: "pending_approval",
        generated_by: "offer_evaluator",
        metadata: { offer_id: OFFER_ID },
      }),
    );
  });

  it("passes the convening object through to the draft helper when provided", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    getOfferByIdSpy.mockResolvedValue(offerRow());
    draftNegotiationEmailSpy.mockResolvedValue({
      subject: "RE: Acme counter",
      body: "Hi team, based on our review…",
    });
    singleResult = {
      data: {
        id: "ot-2",
        type: "negotiation",
        subject: "RE: Acme counter",
        body: "Hi team, based on our review…",
      },
      error: null,
    };

    const convening = {
      offer_evaluator: {
        verdict: "UNDER",
        narrative: "below market",
        risks: [],
      },
      cfo: {
        total_comp_year1: 90000,
        total_comp_4yr: 360000,
        vesting_note: "",
        narrative: "",
      },
      cno: { contacts_at_company: [], narrative: "" },
    };

    const res = await callPost({ convening });
    expect(res.status).toBe(200);
    expect(draftNegotiationEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({ convening }),
    );
  });

  it("tolerates missing / malformed JSON body and defaults convening to null", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    getOfferByIdSpy.mockResolvedValue(offerRow());
    draftNegotiationEmailSpy.mockResolvedValue({
      subject: "RE: Acme",
      body: "Hi team, let's talk about the offer…",
    });
    singleResult = {
      data: { id: "ot-3", type: "negotiation" },
      error: null,
    };

    // No body at all.
    const req = new Request(
      `http://localhost/api/offers/${OFFER_ID}/negotiation-draft`,
      { method: "POST" },
    );
    const res = await POST(req, {
      params: Promise.resolve({ id: OFFER_ID }),
    });
    expect(res.status).toBe(200);
    expect(draftNegotiationEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({ convening: null }),
    );
  });

  it("returns 429 when AI quota is exhausted, never drafts", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    getOfferByIdSpy.mockResolvedValue(offerRow());
    consumeAiQuotaSpy.mockResolvedValueOnce({
      allowed: false,
      used: 26,
      cap: 25,
      reason: "exceeded",
    });

    const res = await callPost({});
    expect(res.status).toBe(429);
    expect(draftNegotiationEmailSpy).not.toHaveBeenCalled();
    expect(insertRowCaptureSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when the convening payload exceeds the size cap", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    getOfferByIdSpy.mockResolvedValue(offerRow());
    // Build a convening object whose serialized form is > 5_000 chars.
    const huge = "x".repeat(6_000);
    const convening = {
      offer_evaluator: { verdict: "MARKET", narrative: huge, risks: [] },
      cfo: {
        total_comp_year1: 100,
        total_comp_4yr: 400,
        vesting_note: "",
        narrative: "",
      },
      cno: { contacts_at_company: [], narrative: "" },
    };
    const res = await callPost({ convening });
    expect(res.status).toBe(400);
    expect(draftNegotiationEmailSpy).not.toHaveBeenCalled();
    expect(insertRowCaptureSpy).not.toHaveBeenCalled();
  });
});
