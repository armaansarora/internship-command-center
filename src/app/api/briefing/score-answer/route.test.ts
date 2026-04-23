/**
 * R6.7 — POST /api/briefing/score-answer contract tests.
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
  beforeEach(() => vi.clearAllMocks());

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
});
