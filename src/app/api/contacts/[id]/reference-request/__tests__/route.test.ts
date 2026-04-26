/**
 * POST /api/contacts/[id]/reference-request contract tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requireUserApiMock = vi.hoisted(() =>
  vi.fn<() => Promise<
    | { ok: true; user: { id: string; firstName: string } }
    | { ok: false; response: Response }
  >>(async () => ({
    ok: true,
    user: { id: "u1", firstName: "Armaan" },
  })),
);
vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserApiMock,
}));

const supabaseFromMock = vi.hoisted(() => vi.fn());
const supabaseStub = vi.hoisted(() => ({ from: supabaseFromMock }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseStub),
}));

const getContactByIdMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries/contacts-rest", () => ({
  getContactById: getContactByIdMock,
}));

const getOfferByIdMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries/offers-rest", () => ({
  getOfferById: getOfferByIdMock,
}));

const draftRefMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/structured/reference-request", () => ({
  draftReferenceRequest: draftRefMock,
}));

import { POST } from "../route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/contacts/c1/reference-request",
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    },
  );
}
const ctx = { params: Promise.resolve({ id: "c1" }) };

const contact = {
  id: "c1",
  name: "Sarah Chen",
  email: "sarah@example.com",
  warmthLevel: "warm",
  companyId: "cx-1",
  notes: "rollout launch",
};
const offer = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "u1",
  application_id: "app-1",
  company_name: "Acme",
  role: "Analyst",
  base: 180000,
};

function insertChain(result: { data: unknown; error: unknown }) {
  const chain: {
    insert: ReturnType<typeof vi.fn<(row: unknown) => typeof chain>>;
    select: ReturnType<typeof vi.fn<(sel: string) => typeof chain>>;
    single: ReturnType<typeof vi.fn<() => Promise<typeof result>>>;
  } = {
    insert: vi.fn((_row: unknown) => chain),
    select: vi.fn((_sel: string) => chain),
    single: vi.fn(async () => result),
  };
  return chain;
}

/**
 * Cooldown SELECT chain for the route's pre-insert duplicate check:
 *   client.from("outreach_queue").select(...).eq(...).eq(...).eq(...).gte(...)
 * Resolves at .gte() with { data: rows, error }.
 */
function cooldownSelectChain(rows: Array<{
  id: string;
  created_at: string;
  metadata: { offer_id?: string };
}>, error: { message: string } | null = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.gte = vi.fn(() => Promise.resolve({ data: rows, error }));
  return chain;
}

/**
 * Convenience: stub the two from("outreach_queue") calls in the happy
 * path — first the empty cooldown SELECT, then the insert chain.
 */
function stubHappyPath(insertResult: { data: unknown; error: unknown }) {
  const cooldown = cooldownSelectChain([]);
  const insertC = insertChain(insertResult);
  supabaseFromMock
    .mockReturnValueOnce(cooldown)
    .mockReturnValueOnce(insertC);
  return { cooldown, insertC };
}

describe("R10.14 POST /api/contacts/[id]/reference-request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserApiMock.mockImplementation(async () => ({
      ok: true,
      user: { id: "u1", firstName: "Armaan" },
    }));
    getContactByIdMock.mockResolvedValue(contact);
    getOfferByIdMock.mockResolvedValue(offer);
    draftRefMock.mockResolvedValue({
      subject: "Quick ask — Acme reference",
      body: "Hi Sarah, I'd love to list you as a reference for Acme. — Armaan",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    requireUserApiMock.mockImplementationOnce(async () => ({
      ok: false,
      response: new Response(JSON.stringify({ error: "unauth" }), { status: 401 }),
    }));
    const res = await POST(
      makeReq({ offerId: "11111111-1111-4111-8111-111111111111" }),
      ctx,
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when offerId is missing", async () => {
    const res = await POST(makeReq({}), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when offerId is not a UUID", async () => {
    const res = await POST(makeReq({ offerId: "not-a-uuid" }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when contact doesn't resolve", async () => {
    getContactByIdMock.mockResolvedValueOnce(null);
    const res = await POST(
      makeReq({ offerId: "11111111-1111-4111-8111-111111111111" }),
      ctx,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when offer doesn't resolve", async () => {
    getOfferByIdMock.mockResolvedValueOnce(null);
    const res = await POST(
      makeReq({ offerId: "11111111-1111-4111-8111-111111111111" }),
      ctx,
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 + inserted row on happy path", async () => {
    const { insertC: chain } = stubHappyPath({
      data: {
        id: "ot-ref-1",
        subject: "Quick ask — Acme reference",
        body: "Hi Sarah…",
        type: "reference_request",
        status: "pending_approval",
        metadata: {
          offer_id: "11111111-1111-4111-8111-111111111111",
          contact_id: "c1",
        },
      },
      error: null,
    });
    const res = await POST(
      makeReq({ offerId: "11111111-1111-4111-8111-111111111111" }),
      ctx,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.outreach.type).toBe("reference_request");
    expect(body.outreach.status).toBe("pending_approval");
    expect(chain.insert).toHaveBeenCalledOnce();
    const insertArg = chain.insert.mock.calls[0]![0] as {
      type: string;
      metadata: { offer_id: string; contact_id: string };
      status: string;
      generated_by: string;
    };
    expect(insertArg.type).toBe("reference_request");
    expect(insertArg.status).toBe("pending_approval");
    expect(insertArg.generated_by).toBe("cno");
    expect(insertArg.metadata).toEqual({
      offer_id: "11111111-1111-4111-8111-111111111111",
      contact_id: "c1",
    });
  });

  it("returns 500 when the insert fails", async () => {
    stubHappyPath({
      data: null,
      error: { message: "boom" },
    });
    const res = await POST(
      makeReq({ offerId: "11111111-1111-4111-8111-111111111111" }),
      ctx,
    );
    expect(res.status).toBe(500);
  });

  // R12 Red Team — cooldown gate (prevents ref-request spam).
  describe("cooldown (6h) — prevents same-(contact, offer) re-draft spam", () => {
    it("returns 429 when a prior reference_request for this (contact, offer) is within window", async () => {
      const recentIso = new Date(
        Date.now() - 60 * 60 * 1000, // 1h ago — well inside 6h cooldown
      ).toISOString();
      const cooldown = cooldownSelectChain([
        {
          id: "prior-1",
          created_at: recentIso,
          metadata: { offer_id: "11111111-1111-4111-8111-111111111111" },
        },
      ]);
      supabaseFromMock.mockReturnValueOnce(cooldown);
      const res = await POST(
        makeReq({ offerId: "11111111-1111-4111-8111-111111111111" }),
        ctx,
      );
      expect(res.status).toBe(429);
      const body = (await res.json()) as {
        error: string;
        retry_after_seconds: number;
      };
      expect(body.error).toBe("cooldown_active");
      expect(body.retry_after_seconds).toBeGreaterThan(0);
      expect(body.retry_after_seconds).toBeLessThanOrEqual(6 * 60 * 60);
      // Insert never reached — draft never generated.
      expect(draftRefMock).not.toHaveBeenCalled();
    });

    it("allows when prior reference_request is for a DIFFERENT offer (same contact)", async () => {
      const recentIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const cooldown = cooldownSelectChain([
        {
          id: "prior-1",
          created_at: recentIso,
          // Different offer id — same contact but cooldown only blocks
          // the (contact, offer) pair.
          metadata: { offer_id: "99999999-9999-4999-8999-999999999999" },
        },
      ]);
      const insertC = insertChain({
        data: {
          id: "ot-ref-2",
          type: "reference_request",
          status: "pending_approval",
          metadata: {
            offer_id: "11111111-1111-4111-8111-111111111111",
            contact_id: "c1",
          },
        },
        error: null,
      });
      supabaseFromMock
        .mockReturnValueOnce(cooldown)
        .mockReturnValueOnce(insertC);
      const res = await POST(
        makeReq({ offerId: "11111111-1111-4111-8111-111111111111" }),
        ctx,
      );
      expect(res.status).toBe(200);
      expect(insertC.insert).toHaveBeenCalledOnce();
    });

    it("returns 500 when the cooldown query itself errors (fail-closed)", async () => {
      const cooldown = cooldownSelectChain([], { message: "cooldown query broken" });
      supabaseFromMock.mockReturnValueOnce(cooldown);
      const res = await POST(
        makeReq({ offerId: "11111111-1111-4111-8111-111111111111" }),
        ctx,
      );
      expect(res.status).toBe(500);
      // Insert never reached on cooldown-query failure.
      expect(draftRefMock).not.toHaveBeenCalled();
    });
  });
});
