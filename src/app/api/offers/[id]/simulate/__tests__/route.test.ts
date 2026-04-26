/**
 * POST /api/offers/[id]/simulate contract tests.
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

/**
 * R10 post-mortem (test-tightening pass) — 4-round simulator flow.
 *
 * The R10 Proof line says: "Simulator runs 3-5 rounds with final score." The
 * existing tests in this file jumped straight from round 0 to a stubbed
 * done=true (the case above) and the component test only covered the
 * round-0 → round-1 transition. Nothing exercised 3-5 sequential rounds with
 * accumulating history AND a final scoring aggregation.
 *
 * This block runs the full chain:
 *   POST 1  — opening (userReply=null)        → round 0, done=false, no scoring
 *   POST 2  — user anchors hard               → round 1, done=false, scoring 5/5/5
 *   POST 3  — user concedes within flex       → round 2, done=false, scoring 4/4/4
 *   POST 4  — user concedes again             → round 3, done=false, scoring 3/3/3
 *   POST 5  — user threatens walkaway         → round 4, done=true,  scoring 2/2/4
 *
 * Asserts:
 *   - simulateTurn receives the cumulative history on each call (length grows
 *     from 0 → 2 → 4 → 6 → 8).
 *   - simulateTurn's `userReply` argument matches the client's stance arc.
 *   - The final POST returns done=true with all three scores in [0,5] AND a
 *     critique string mentioning one of {anchor, concession, walk}.
 *   - The flow is deterministic: running the identical 5-POST sequence twice
 *     yields identical scoring on the final round.
 */
describe("R10 post-mortem — POST /api/offers/[id]/simulate (4-round flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserApiMock.mockImplementation(async () => ({
      ok: true as const,
      user: { id: "u1", firstName: "Armaan" },
    }));
    getOfferByIdMock.mockResolvedValue(offerRow);
  });

  /**
   * The client appends [user_reply, recruiter_reply] to history AFTER each
   * turn (see NegotiationSimulator.tsx:92-100). This helper mirrors that
   * client-side accumulation so the test exercises the same history-growth
   * pattern the real UI sends.
   */
  function appendTurns(
    prior: Array<{ role: "user" | "recruiter"; text: string }>,
    userReply: string | null,
    recruiterReply: string,
  ): Array<{ role: "user" | "recruiter"; text: string }> {
    const withUser = userReply
      ? [...prior, { role: "user" as const, text: userReply }]
      : prior;
    return [...withUser, { role: "recruiter" as const, text: recruiterReply }];
  }

  function stagedReplies(): Array<{
    recruiterReply: string;
    scoring: {
      anchorScore: number;
      concessionScore: number;
      walkawayScore: number;
      critique: string;
    } | null;
  }> {
    return [
      // Round 0 — opener, no scoring (userReply=null).
      {
        recruiterReply: "We can offer $170,000 base + $10K signing bonus.",
        scoring: null,
      },
      // Round 1 — user anchored hard at $200K, recruiter holds.
      {
        recruiterReply: "I hear $200K. Let me check with my director.",
        scoring: {
          anchorScore: 5,
          concessionScore: 5,
          walkawayScore: 5,
          critique: "Strong anchor hold near stance.anchor.",
        },
      },
      // Round 2 — user conceded within flex, modest hold.
      {
        recruiterReply: "We can move to $185K, but no more on equity.",
        scoring: {
          anchorScore: 4,
          concessionScore: 4,
          walkawayScore: 4,
          critique: "Concession stayed within flex band.",
        },
      },
      // Round 3 — user conceded again.
      {
        recruiterReply: "Best I can do is $182K with the equity refresh.",
        scoring: {
          anchorScore: 3,
          concessionScore: 3,
          walkawayScore: 3,
          critique: "Continued concession; anchor erosion.",
        },
      },
      // Round 4 — user signaled walkaway; final scoring.
      {
        recruiterReply: "Understood. Let me re-open the equity refresh.",
        scoring: {
          anchorScore: 2,
          concessionScore: 2,
          walkawayScore: 4,
          critique: "Walkaway signal acknowledged; recruiter re-anchored.",
        },
      },
    ];
  }

  /**
   * Run the full 5-POST flow once. Returns the array of route response bodies
   * + the array of simulateTurn call-args (so tests can assert both the
   * client-visible response shape AND the cumulative history that landed on
   * the helper).
   */
  async function runFiveRoundFlow(): Promise<{
    responses: Array<{
      recruiterReply: string;
      scoring: {
        anchorScore: number;
        concessionScore: number;
        walkawayScore: number;
        critique: string;
      } | null;
      round: number;
      done: boolean;
    }>;
    simulateCalls: Array<{
      history: Array<{ role: "user" | "recruiter"; text: string }>;
      userReply: string | null;
    }>;
  }> {
    const staged = stagedReplies();
    let nth = 0;
    simulateTurnMock.mockImplementation(async () => {
      const reply = staged[nth];
      nth += 1;
      if (!reply) throw new Error(`unexpected ${nth}th simulateTurn call`);
      return reply;
    });

    const userReplies: Array<string | null> = [
      null, // round 0 — opener
      "I was anchoring at $200,000 given comparable NYC roles.", // round 1 — anchor
      "I can come down to $190K if equity stays.", // round 2 — flex
      "OK, $186K works if signing bonus moves to $20K.", // round 3 — flex
      "If that's the floor I'd need to walk and stay where I am.", // round 4 — walkaway
    ];
    const stance = { anchor: 200000, flex: 10000, walkaway: 180000 };

    let history: Array<{ role: "user" | "recruiter"; text: string }> = [];
    const responses: Array<{
      recruiterReply: string;
      scoring: {
        anchorScore: number;
        concessionScore: number;
        walkawayScore: number;
        critique: string;
      } | null;
      round: number;
      done: boolean;
    }> = [];
    for (const userReply of userReplies) {
      // Client semantics: when there's a userReply, the client appends it to
      // history BEFORE POSTing (mirrors NegotiationSimulator.tsx:79-83).
      const historyForPost = userReply
        ? [...history, { role: "user" as const, text: userReply }]
        : history;
      const res = await POST(
        makeReq({ stance, history: historyForPost, userReply }),
        ctx,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        recruiterReply: string;
        scoring: typeof responses[number]["scoring"];
        round: number;
        done: boolean;
      };
      responses.push(body);
      history = appendTurns(history, userReply, body.recruiterReply);
    }

    const simulateCalls = simulateTurnMock.mock.calls.map(
      ([call]) => ({
        history: (call as { history: Array<{ role: "user" | "recruiter"; text: string }> }).history,
        userReply: (call as { userReply: string | null }).userReply,
      }),
    );
    return { responses, simulateCalls };
  }

  it("accumulates history across 5 sequential POSTs (lengths 0 → 2 → 4 → 6 → 8)", async () => {
    const { simulateCalls } = await runFiveRoundFlow();
    expect(simulateCalls.length).toBe(5);
    expect(simulateCalls.map((c) => c.history.length)).toEqual([0, 2, 4, 6, 8]);
    // The cumulative history fed to simulateTurn always carries every prior
    // turn — the helper relies on this for round-aware coaching.
    expect(simulateCalls[2]!.history[0]).toEqual(simulateCalls[1]!.history[0]);
    expect(simulateCalls[4]!.history[0]).toEqual(simulateCalls[1]!.history[0]);
  });

  it("forwards each user reply (anchor → flex → flex → walkaway) to simulateTurn in order", async () => {
    const { simulateCalls } = await runFiveRoundFlow();
    expect(simulateCalls[0]!.userReply).toBeNull();
    expect(simulateCalls[1]!.userReply).toMatch(/200,000/);
    expect(simulateCalls[2]!.userReply).toMatch(/190K/);
    expect(simulateCalls[3]!.userReply).toMatch(/186K/);
    expect(simulateCalls[4]!.userReply).toMatch(/walk/i);
  });

  it("final round returns done=true with all three scores in [0,5] and critique mentioning anchor/concession/walk", async () => {
    const { responses } = await runFiveRoundFlow();
    expect(responses.map((r) => r.round)).toEqual([0, 1, 2, 3, 4]);
    expect(responses.map((r) => r.done)).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);

    const final = responses[4]!;
    expect(final.done).toBe(true);
    expect(final.scoring).not.toBeNull();
    const s = final.scoring!;
    for (const v of [s.anchorScore, s.concessionScore, s.walkawayScore]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(5);
    }
    expect(s.critique.toLowerCase()).toMatch(/anchor|concession|walk/);
  });

  it("is deterministic: identical 5-POST input yields identical final scoring across two runs", async () => {
    const a = await runFiveRoundFlow();
    const b = await runFiveRoundFlow();
    expect(a.responses[4]!.scoring).toEqual(b.responses[4]!.scoring);
    expect(a.responses[4]!.done).toBe(b.responses[4]!.done);
    expect(a.responses[4]!.round).toBe(b.responses[4]!.round);
  });
});
