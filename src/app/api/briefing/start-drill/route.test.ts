/**
 * POST /api/briefing/start-drill contract tests.
 *
 * Locks in:
 *  - 400 on malformed body
 *  - 404 when the interview isn't found (wrong id or wrong user)
 *  - 200 happy-path: 3 questions, a fresh drillId, company/round copied through
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requireUserMock = vi.hoisted(() => vi.fn(async () => ({ id: "user-1" })));
const sbMock = vi.hoisted(() => ({
  from: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  requireUser: requireUserMock,
  createClient: vi.fn(async () => sbMock),
}));

const genMock = vi.hoisted(() =>
  vi.fn(async () => [
    { id: "q1", text: "Tell me about a time...", category: "behavioral", rubric: "Look for STAR." },
    { id: "q2", text: "Why this firm?", category: "culture-fit", rubric: "Specific mentions." },
    { id: "q3", text: "Walk me through a case...", category: "case", rubric: "Structured thinking." },
  ]),
);
vi.mock("@/lib/ai/structured/drill-questions", () => ({
  generateDrillQuestions: genMock,
}));

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

function mockSelectChain(rows: unknown[]) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: rows[0] ?? null, error: null })),
  };
  return chain;
}

async function callPost(body: unknown) {
  const { POST } = await import("./route");
  const req = new NextRequest("http://localhost/api/briefing/start-drill", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("POST /api/briefing/start-drill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeAiQuotaMock.mockResolvedValue({ allowed: true, used: 1, cap: 25 });
    sbMock.from.mockImplementation((table: string) => {
      if (table === "interviews") {
        return mockSelectChain([
          {
            id: "11111111-1111-4111-8111-111111111111",
            application_id: "app-1",
            round: "1",
            prep_packet_id: null,
            user_id: "user-1",
          },
        ]);
      }
      if (table === "applications") {
        return mockSelectChain([{ company_name: "CBRE", role: "Analyst" }]);
      }
      return mockSelectChain([]);
    });
  });

  it("400 on invalid body", async () => {
    const res = await callPost({ interviewId: "not-uuid" });
    expect(res.status).toBe(400);
  });

  it("404 when interview not found", async () => {
    sbMock.from.mockImplementation(() => mockSelectChain([null]));
    const res = await callPost({ interviewId: "11111111-1111-4111-8111-111111111111" });
    expect(res.status).toBe(404);
  });

  it("200 returns 3 questions + drillId", async () => {
    const res = await callPost({ interviewId: "11111111-1111-4111-8111-111111111111" });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.questions).toHaveLength(3);
    expect(j.drillId).toMatch(/^[0-9a-f-]{36}$/);
    expect(j.company).toBe("CBRE");
    expect(genMock).toHaveBeenCalledOnce();
  });

  it("429 when AI quota is exhausted, never queries DB", async () => {
    consumeAiQuotaMock.mockResolvedValueOnce({
      allowed: false,
      used: 26,
      cap: 25,
      reason: "exceeded",
    });
    const res = await callPost({
      interviewId: "11111111-1111-4111-8111-111111111111",
    });
    expect(res.status).toBe(429);
    expect(genMock).not.toHaveBeenCalled();
  });
});
