/**
 * POST + GET /api/offers contract tests.
 *
 * Invariants:
 *  - 401 when unauthenticated; DB helper never called.
 *  - 400 when body fails Zod (missing required, extra keys via .strict()).
 *  - 200 with `{ offer }` on happy POST, scoped to auth'd user.id.
 *  - 200 with `{ offers: [] }` on empty GET; respects insertOffer/getOffersForUser contracts.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

const { requireUserSpy, insertOfferSpy, getOffersForUserSpy } = vi.hoisted(
  () => ({
    requireUserSpy: vi.fn(),
    insertOfferSpy: vi.fn(),
    getOffersForUserSpy: vi.fn(),
  }),
);

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ __mock: true }),
}));

vi.mock("@/lib/db/queries/offers-rest", () => ({
  insertOffer: insertOfferSpy,
  getOffersForUser: getOffersForUserSpy,
}));

const { POST, GET } = await import("./route");

const OK_AUTH = {
  ok: true as const,
  user: { id: "user-abc", email: "owner@example.com" },
};

function makePostReq(body: unknown): Request {
  return new Request("http://localhost/api/offers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    companyName: "Acme Corp",
    role: "Software Engineer",
    location: "New York, NY",
    base: 120000,
    ...overrides,
  };
}

function offerRow(overrides: Partial<OfferRow> = {}): OfferRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: "user-abc",
    application_id: null,
    company_name: "Acme Corp",
    role: "Software Engineer",
    level: null,
    location: "New York, NY",
    base: 120000,
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

beforeEach(() => {
  requireUserSpy.mockReset();
  insertOfferSpy.mockReset();
  getOffersForUserSpy.mockReset();
});

describe("POST /api/offers", () => {
  it("returns 401 when unauthenticated and never calls insertOffer", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    });

    const res = await POST(makePostReq(validBody()));
    expect(res.status).toBe(401);
    expect(insertOfferSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when body is missing required fields", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await POST(makePostReq({ role: "Engineer" }));
    expect(res.status).toBe(400);
    expect(insertOfferSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when base is negative", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await POST(makePostReq(validBody({ base: -1 })));
    expect(res.status).toBe(400);
    expect(insertOfferSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when body has extra keys (.strict())", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await POST(
      makePostReq(validBody({ nefariousExtraKey: "hi" })),
    );
    expect(res.status).toBe(400);
    expect(insertOfferSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when body isn't valid JSON", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const req = new Request("http://localhost/api/offers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(insertOfferSpy).not.toHaveBeenCalled();
  });

  it("returns 200 with inserted offer on happy path", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    const row = offerRow();
    insertOfferSpy.mockResolvedValue(row);

    const res = await POST(makePostReq(validBody()));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { offer: OfferRow };
    expect(body.offer.id).toBe(row.id);
    expect(body.offer.company_name).toBe("Acme Corp");

    expect(insertOfferSpy).toHaveBeenCalledTimes(1);
    const [, input] = insertOfferSpy.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(input.userId).toBe("user-abc");
    expect(input.companyName).toBe("Acme Corp");
    expect(input.base).toBe(120000);
  });
});

describe("GET /api/offers", () => {
  it("returns 401 when unauthenticated and never calls getOffersForUser", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    });

    const res = await GET();
    expect(res.status).toBe(401);
    expect(getOffersForUserSpy).not.toHaveBeenCalled();
  });

  it("returns 200 with empty array when user has no offers", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    getOffersForUserSpy.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = (await res.json()) as { offers: OfferRow[] };
    expect(body.offers).toEqual([]);
    expect(getOffersForUserSpy).toHaveBeenCalledWith(
      expect.anything(),
      "user-abc",
    );
  });

  it("returns 200 with user's offers", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    getOffersForUserSpy.mockResolvedValue([offerRow(), offerRow({ id: "22222222-2222-4222-8222-222222222222" })]);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = (await res.json()) as { offers: OfferRow[] };
    expect(body.offers).toHaveLength(2);
  });
});
