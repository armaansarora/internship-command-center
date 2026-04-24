/**
 * R10.13 — POST /api/offers/[id]/simulate contract tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type RequireUserApiResult =
  | { ok: true; user: { id: string; firstName: string } }
  | { ok: false; response: Response };

const requireUserApiMock = vi.hoisted(() =>
  vi.fn<() => Promise<RequireUserApiResult>>(async () => ({
    ok: true,
    user: { id: "u1", firstName: "Armaan" },
  })),
);
vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserApiMock,
}));

const getOfferByIdMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries/offers-rest", () => ({
  getOfferById: getOfferByIdMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

const simulateTurnMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/structured/simulator-turn", () => ({
  simulateTurn: simulateTurnMock,
}));

import { POST } from "../route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/offers/o1/simulate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const ctx = { params: Promise.resolve({ id: "o1" }) };

const validBody = {
  stance: { anchor: 185000, flex: 5000, walkaway: 170000 },
  history: [],
  userReply: null,
};

const offerRow = {
  id: "o1",
  user_id: "u1",
  company_name: "Acme",
  role: "Analyst",
  base: 180000,
};

describe("R10.13 POST /api/offers/[id]/simulate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserApiMock.mockImplementation(async () => ({
      ok: true as const,
      user: { id: "u1", firstName: "Armaan" },
    }));
    getOfferByIdMock.mockResolvedValue(offerRow);
    simulateTurnMock.mockResolvedValue({
      recruiterReply: "We can offer $170,000.",
      scoring: null,
    });
  });

  it("returns 401 when unauthenticated", async () => {
    requireUserApiMock.mockImplementationOnce(async () => ({
      ok: false as const,
      response: new Response(JSON.stringify({ error: "unauth" }), { status: 401 }),
    }));
    const res = await POST(makeReq(validBody), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when offer is not found", async () => {
    getOfferByIdMock.mockResolvedValueOnce(null);
    const res = await POST(makeReq(validBody), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 400 when body is malformed", async () => {
    const res = await POST(makeReq({ stance: {}, history: "nope" }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 200 + round=0 + done=false on opening turn", async () => {
    const res = await POST(makeReq(validBody), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recruiterReply).toBeTypeOf("string");
    expect(body.scoring).toBeNull();
    expect(body.round).toBe(0);
    expect(body.done).toBe(false);
  });

  it("returns done=true when history reaches 8 turns (4 rounds)", async () => {
    const eightTurns = Array.from({ length: 8 }, (_, i) => ({
      role: i % 2 === 0 ? "recruiter" : "user",
      text: `turn ${i}`,
    }));
    const res = await POST(
      makeReq({
        stance: validBody.stance,
        history: eightTurns,
        userReply: "final",
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.done).toBe(true);
    expect(body.round).toBe(4);
  });
});
