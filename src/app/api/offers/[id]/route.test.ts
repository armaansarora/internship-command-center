/**
 * GET + PATCH /api/offers/[id] contract tests.
 *
 * Invariants:
 *  - 401 on both verbs when unauthenticated; DB never touched.
 *  - GET: 404 when the offer does not exist (or isn't owned by the user).
 *  - GET: 200 with `{ offer }` on happy path.
 *  - PATCH: 404 when the offer doesn't exist (checked before update runs).
 *  - PATCH: 400 on invalid status enum or extra keys (.strict()).
 *  - PATCH: 200 `{ success: true }` on happy path; updateOfferStatus called
 *    with the authenticated user.id, offer id, and new status.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

const { requireUserSpy, getOfferByIdSpy, updateOfferStatusSpy } = vi.hoisted(
  () => ({
    requireUserSpy: vi.fn(),
    getOfferByIdSpy: vi.fn(),
    updateOfferStatusSpy: vi.fn(),
  }),
);

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ __mock: true }),
}));

vi.mock("@/lib/db/queries/offers-rest", () => ({
  getOfferById: getOfferByIdSpy,
  updateOfferStatus: updateOfferStatusSpy,
}));

const { GET, PATCH } = await import("./route");

const OK_AUTH = {
  ok: true as const,
  user: { id: "user-abc", email: "owner@example.com" },
};

const OFFER_ID = "11111111-1111-4111-8111-111111111111";

function offerRow(overrides: Partial<OfferRow> = {}): OfferRow {
  return {
    id: OFFER_ID,
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

function makeReq(method: string, body?: unknown): Request {
  return new Request(`http://localhost/api/offers/${OFFER_ID}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function callGet(): Promise<Response> {
  return GET(makeReq("GET"), { params: Promise.resolve({ id: OFFER_ID }) });
}

async function callPatch(body: unknown): Promise<Response> {
  return PATCH(makeReq("PATCH", body), {
    params: Promise.resolve({ id: OFFER_ID }),
  });
}

beforeEach(() => {
  requireUserSpy.mockReset();
  getOfferByIdSpy.mockReset();
  updateOfferStatusSpy.mockReset();
});

describe("GET /api/offers/[id]", () => {
  it("returns 401 when unauthenticated and never queries the offer", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    });

    const res = await callGet();
    expect(res.status).toBe(401);
    expect(getOfferByIdSpy).not.toHaveBeenCalled();
  });

  it("returns 404 when the offer does not exist", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    getOfferByIdSpy.mockResolvedValue(null);

    const res = await callGet();
    expect(res.status).toBe(404);

    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("not_found");
  });

  it("returns 200 with the offer on happy path", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    const row = offerRow();
    getOfferByIdSpy.mockResolvedValue(row);

    const res = await callGet();
    expect(res.status).toBe(200);

    const body = (await res.json()) as { offer: OfferRow };
    expect(body.offer.id).toBe(OFFER_ID);

    expect(getOfferByIdSpy).toHaveBeenCalledWith(
      expect.anything(),
      "user-abc",
      OFFER_ID,
    );
  });
});

describe("PATCH /api/offers/[id]", () => {
  it("returns 401 when unauthenticated and never mutates", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    });

    const res = await callPatch({ status: "negotiating" });
    expect(res.status).toBe(401);
    expect(getOfferByIdSpy).not.toHaveBeenCalled();
    expect(updateOfferStatusSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when status is not in the enum", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await callPatch({ status: "in_progress" });
    expect(res.status).toBe(400);
    expect(updateOfferStatusSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when body is missing status", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await callPatch({});
    expect(res.status).toBe(400);
    expect(updateOfferStatusSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when body has extra keys (.strict())", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const res = await callPatch({
      status: "negotiating",
      nefariousExtraKey: "hi",
    });
    expect(res.status).toBe(400);
    expect(updateOfferStatusSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when body isn't valid JSON", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    const req = new Request(`http://localhost/api/offers/${OFFER_ID}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: OFFER_ID }) });
    expect(res.status).toBe(400);
    expect(updateOfferStatusSpy).not.toHaveBeenCalled();
  });

  it("returns 404 when the offer does not exist", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    getOfferByIdSpy.mockResolvedValue(null);

    const res = await callPatch({ status: "negotiating" });
    expect(res.status).toBe(404);
    expect(updateOfferStatusSpy).not.toHaveBeenCalled();
  });

  it("returns 200 and calls updateOfferStatus on happy path", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    getOfferByIdSpy.mockResolvedValue(offerRow());
    updateOfferStatusSpy.mockResolvedValue(undefined);

    const res = await callPatch({ status: "accepted" });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    expect(updateOfferStatusSpy).toHaveBeenCalledWith(
      expect.anything(),
      "user-abc",
      OFFER_ID,
      "accepted",
    );
  });
});
