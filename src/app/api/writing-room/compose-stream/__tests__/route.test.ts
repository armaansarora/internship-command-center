/**
 * /api/writing-room/compose-stream contract test.
 *
 * Asserts:
 *   - 401 when unauthenticated
 *   - 400 when body is invalid
 *   - 200 with text/plain stream body when authenticated + valid
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUserMock(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/ai/model", () => ({
  getAgentModel: () => ({ __mock: "model" }),
  getActiveModelId: () => "mock-model",
}));
vi.mock("@/lib/ai/prompt-cache", () => ({
  getCachedSystem: (s: string) => s,
}));
vi.mock("@/lib/ai/telemetry", () => ({
  recordAgentRun: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/stripe/entitlements", () => ({
  getUserTier: vi.fn(async () => "free"),
}));
vi.mock("@/lib/ai/quota", () => ({
  consumeAiQuota: vi.fn(async () => ({ allowed: true, used: 1, cap: 25 })),
}));

vi.mock("ai", () => {
  return {
    streamText: vi.fn(() => ({
      textStream: (async function* () {
        yield "tok1 ";
        yield "tok2 ";
        yield "tok3";
      })(),
      text: Promise.resolve("tok1 tok2 tok3"),
      toTextStreamResponse() {
        return new Response(
          new ReadableStream<Uint8Array>({
            async start(controller) {
              const enc = new TextEncoder();
              for (const t of ["tok1 ", "tok2 ", "tok3"]) controller.enqueue(enc.encode(t));
              controller.close();
            },
          }),
          { headers: { "content-type": "text/plain; charset=utf-8" } },
        );
      },
    })),
    generateText: vi.fn(),
  };
});

import { POST } from "../route";

describe("POST /api/writing-room/compose-stream", () => {
  beforeEach(() => {
    getUserMock.mockReset();
  });

  it("401 when unauthenticated", async () => {
    getUserMock.mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/writing-room/compose-stream", {
        method: "POST",
        body: JSON.stringify({ tone: "formal", companyName: "Acme", role: "Analyst" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400 when body invalid", async () => {
    getUserMock.mockResolvedValue({ id: "u1", email: "u@x" });
    const res = await POST(
      new Request("http://localhost/api/writing-room/compose-stream", {
        method: "POST",
        body: JSON.stringify({ tone: "not-a-tone" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("200 text/plain stream on valid request", async () => {
    getUserMock.mockResolvedValue({ id: "u1", email: "u@x" });
    const res = await POST(
      new Request("http://localhost/api/writing-room/compose-stream", {
        method: "POST",
        body: JSON.stringify({
          tone: "formal",
          companyName: "Acme",
          role: "Analyst",
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const full = await res.text();
    expect(full).toBe("tok1 tok2 tok3");
  });
});
