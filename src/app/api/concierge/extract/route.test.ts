/**
 * /api/concierge/extract route contract tests.
 *
 * Locks the skip path + auth + validation behavior. The conversation path
 * (which calls generateObject against a real Anthropic model) is
 * exercised by the R4.11 Proof test against a fixture transcript.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUserMock(),
}));

const extractMock = vi.fn();
const skipPlaceholderMock = vi.fn();
vi.mock("@/lib/agents/concierge/extract", () => ({
  extractTargetProfileFromConversation: (...args: unknown[]) =>
    extractMock(...args),
  persistSkipPlaceholderProfile: (...args: unknown[]) =>
    skipPlaceholderMock(...args),
}));

interface QuotaResultLike {
  allowed: boolean;
  used: number;
  cap: number;
  reason?: "exceeded" | "rpc_error";
}
const consumeAiQuotaMock = vi.fn<(userId: string, tier: string) => Promise<QuotaResultLike>>(
  async () => ({ allowed: true, used: 1, cap: 25 }),
);
vi.mock("@/lib/ai/quota", () => ({
  consumeAiQuota: (userId: string, tier: string) => consumeAiQuotaMock(userId, tier),
}));

vi.mock("@/lib/stripe/entitlements", () => ({
  getUserTier: vi.fn(async () => "free"),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/concierge/extract", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/concierge/extract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeAiQuotaMock.mockResolvedValue({ allowed: true, used: 1, cap: 25 });
  });

  it("401s when unauthenticated", async () => {
    getUserMock.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ turns: [], skip: true }));
    expect(res.status).toBe(401);
  });

  it("400s on malformed body", async () => {
    getUserMock.mockResolvedValueOnce({ id: "u-1", email: "test@example.com" });
    const res = await POST(
      new Request("http://localhost/api/concierge/extract", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("routes skip=true to persistSkipPlaceholderProfile and returns 'skip'", async () => {
    getUserMock.mockResolvedValueOnce({ id: "u-2", email: "t@e.com" });
    skipPlaceholderMock.mockResolvedValueOnce({
      source: "skip",
      completedAt: "2026-04-23T10:00:00.000Z",
      profile: {
        version: 1,
        roles: ["Software Engineer"],
        level: ["intern", "new_grad"],
        geos: ["Remote"],
        companies: [],
        musts: [],
        nices: [],
      },
    });

    const res = await POST(makeRequest({ turns: [], skip: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("skip");
    expect(body.profile.roles).toContain("Software Engineer");
    expect(skipPlaceholderMock).toHaveBeenCalledWith("u-2");
    expect(extractMock).not.toHaveBeenCalled();
  });

  it("routes a conversation transcript to extractTargetProfileFromConversation", async () => {
    getUserMock.mockResolvedValueOnce({ id: "u-3", email: "t@e.com" });
    extractMock.mockResolvedValueOnce({
      source: "conversation",
      completedAt: "2026-04-23T10:05:00.000Z",
      profile: {
        version: 1,
        roles: ["Product Designer", "UX Engineer"],
        level: ["intern"],
        geos: ["SF", "Remote"],
        companies: ["Linear", "Vercel"],
        musts: [],
        nices: [],
      },
    });

    const res = await POST(
      makeRequest({
        skip: false,
        turns: [
          { role: "assistant", text: "Morning. First time in the building?" },
          { role: "user", text: "Yes — looking for product design internships at Linear or Vercel." },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("conversation");
    expect(extractMock).toHaveBeenCalledWith(
      "u-3",
      expect.arrayContaining([
        expect.objectContaining({ role: "user" }),
      ]),
    );
    expect(skipPlaceholderMock).not.toHaveBeenCalled();
  });

  it("500s if the extractor returns null (e.g., persistence failure)", async () => {
    getUserMock.mockResolvedValueOnce({ id: "u-4", email: "t@e.com" });
    skipPlaceholderMock.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ turns: [], skip: true }));
    expect(res.status).toBe(500);
  });

  it("429s when AI quota is exhausted on the conversation path", async () => {
    getUserMock.mockResolvedValueOnce({ id: "u-q", email: "q@e.com" });
    consumeAiQuotaMock.mockResolvedValueOnce({
      allowed: false,
      used: 26,
      cap: 25,
      reason: "exceeded",
    });
    const res = await POST(
      makeRequest({
        skip: false,
        turns: [
          { role: "assistant", text: "Hi." },
          { role: "user", text: "Hello." },
        ],
      }),
    );
    expect(res.status).toBe(429);
    expect(extractMock).not.toHaveBeenCalled();
  });

  it("does not consume quota on the skip path", async () => {
    getUserMock.mockResolvedValueOnce({ id: "u-skip", email: "s@e.com" });
    skipPlaceholderMock.mockResolvedValueOnce({
      source: "skip",
      completedAt: "2026-04-26T10:00:00.000Z",
      profile: {
        version: 1,
        roles: ["Software Engineer"],
        level: ["intern"],
        geos: ["Remote"],
        companies: [],
        musts: [],
        nices: [],
      },
    });
    const res = await POST(makeRequest({ turns: [], skip: true }));
    expect(res.status).toBe(200);
    expect(consumeAiQuotaMock).not.toHaveBeenCalled();
  });

  it("400s when an individual turn exceeds the per-turn cap", async () => {
    getUserMock.mockResolvedValueOnce({ id: "u-big", email: "b@e.com" });
    const oversized = "x".repeat(2_001);
    const res = await POST(
      makeRequest({
        skip: false,
        turns: [{ role: "user", text: oversized }],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400s when total transcript bytes exceed the ceiling", async () => {
    getUserMock.mockResolvedValueOnce({ id: "u-big2", email: "b@e.com" });
    // 11 turns at 1900 chars each = 20_900 > 20_000
    const turn = "x".repeat(1_900);
    const turns = Array.from({ length: 11 }, (_, i) => ({
      role: i % 2 === 0 ? "assistant" : "user",
      text: turn,
    }));
    const res = await POST(makeRequest({ skip: false, turns }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("transcript_too_large");
  });
});
