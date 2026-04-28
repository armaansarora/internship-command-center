/**
 * POST /api/briefing/score-answer contract tests.
 *
 * Locks in:
 *  - 400 on malformed body
 *  - 200 happy-path returns stars + score + narrative + nudge
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));

const scoreMock = vi.hoisted(() =>
  vi.fn(async () => ({
    stars: { s: 80, t: 70, a: 85, r: 60 },
    score: 76,
    narrative: "Solid Action. Tighten the Result.",
    nudge: "Quantify the outcome.",
  })),
);
vi.mock("@/lib/ai/structured/score-answer", () => ({ scoreAnswer: scoreMock }));

interface QuotaResultLike {
  allowed: boolean;
  used: number;
  cap: number;
  reason?: "exceeded" | "rpc_error";
}
const consumeAiQuotaMock = vi.hoisted(() =>
  vi.fn<(userId: string, tier: string) => Promise<QuotaResultLike>>(
    async () => ({ allowed: true, used: 1, cap: 25 }),
  ),
);
vi.mock("@/lib/ai/quota", () => ({
  consumeAiQuota: consumeAiQuotaMock,
}));
vi.mock("@/lib/stripe/entitlements", () => ({
  getUserTier: vi.fn(async () => "free"),
}));

async function callPost(body: unknown) {
  const { POST } = await import("./route");
  const req = new NextRequest("http://localhost/api/briefing/score-answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("POST /api/briefing/score-answer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeAiQuotaMock.mockResolvedValue({ allowed: true, used: 1, cap: 25 });
  });

  it("400 on bad body", async () => {
    const res = await callPost({});
    expect(res.status).toBe(400);
  });

  it("200 returns stars + score + narrative + nudge", async () => {
    const res = await callPost({
      drillId: "11111111-1111-4111-8111-111111111111",
      questionId: "q1",
      question: "Tell me about a time...",
      rubric: "STAR complete.",
      answer: "I built a thing and shipped it.",
    });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.stars.a).toBe(85);
    expect(j.score).toBe(76);
    expect(scoreMock).toHaveBeenCalledOnce();
  });

  it("429 when AI quota is exhausted, never calls scorer", async () => {
    consumeAiQuotaMock.mockResolvedValueOnce({
      allowed: false,
      used: 26,
      cap: 25,
      reason: "exceeded",
    });
    const res = await callPost({
      drillId: "11111111-1111-4111-8111-111111111111",
      questionId: "q1",
      question: "Tell me about a time...",
      rubric: "STAR complete.",
      answer: "I built a thing and shipped it.",
    });
    expect(res.status).toBe(429);
    expect(scoreMock).not.toHaveBeenCalled();
  });

  it("400 when answer exceeds 5_000 chars", async () => {
    const oversized = "x".repeat(5_001);
    const res = await callPost({
      drillId: "11111111-1111-4111-8111-111111111111",
      questionId: "q1",
      question: "Tell me about a time...",
      rubric: "STAR complete.",
      answer: oversized,
    });
    expect(res.status).toBe(400);
    expect(scoreMock).not.toHaveBeenCalled();
  });

  it("400 when rubric exceeds 5_000 chars", async () => {
    const oversized = "x".repeat(5_001);
    const res = await callPost({
      drillId: "11111111-1111-4111-8111-111111111111",
      questionId: "q1",
      question: "Tell me about a time...",
      rubric: oversized,
      answer: "Short answer.",
    });
    expect(res.status).toBe(400);
  });
});
