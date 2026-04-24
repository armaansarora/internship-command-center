/**
 * R10.14 — POST /api/contacts/[id]/reference-request contract tests.
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
    const chain = insertChain({
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
    supabaseFromMock.mockReturnValueOnce(chain);
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
    const chain = insertChain({
      data: null,
      error: { message: "boom" },
    });
    supabaseFromMock.mockReturnValueOnce(chain);
    const res = await POST(
      makeReq({ offerId: "11111111-1111-4111-8111-111111111111" }),
      ctx,
    );
    expect(res.status).toBe(500);
  });
});
