import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

const {
  streamTextSpy,
  stepCountIsSpy,
  convertToModelMessagesSpy,
  requireUserSpy,
  rateLimitSpy,
  requireAgentAccessSpy,
  getUserTierSpy,
  consumeAiQuotaSpy,
  getMemoriesForContextSpy,
  recordAgentRunSpy,
  extractAndStoreMemoriesSpy,
  getAgentModelSpy,
  getActiveModelIdSpy,
  isAgentModelConfiguredSpy,
  requireEnvSpy,
  logInfoSpy,
  logErrorSpy,
} = vi.hoisted(() => ({
  streamTextSpy: vi.fn(),
  stepCountIsSpy: vi.fn(),
  convertToModelMessagesSpy: vi.fn(),
  requireUserSpy: vi.fn(),
  rateLimitSpy: vi.fn(),
  requireAgentAccessSpy: vi.fn(),
  getUserTierSpy: vi.fn(),
  consumeAiQuotaSpy: vi.fn(),
  getMemoriesForContextSpy: vi.fn(),
  recordAgentRunSpy: vi.fn(),
  extractAndStoreMemoriesSpy: vi.fn(),
  getAgentModelSpy: vi.fn(),
  getActiveModelIdSpy: vi.fn(),
  isAgentModelConfiguredSpy: vi.fn(),
  requireEnvSpy: vi.fn(),
  logInfoSpy: vi.fn(),
  logErrorSpy: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: streamTextSpy,
  stepCountIs: stepCountIsSpy,
  convertToModelMessages: convertToModelMessagesSpy,
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/rate-limit-middleware", () => ({
  withRateLimit: rateLimitSpy,
}));

vi.mock("@/lib/stripe/agent-access", () => ({
  requireAgentAccess: requireAgentAccessSpy,
}));

vi.mock("@/lib/stripe/entitlements", () => ({
  getUserTier: getUserTierSpy,
}));

vi.mock("@/lib/ai/quota", () => ({
  consumeAiQuota: consumeAiQuotaSpy,
}));

vi.mock("@/lib/db/queries/agent-memory-rest", () => ({
  getMemoriesForContext: getMemoriesForContextSpy,
}));

vi.mock("@/lib/ai/prompt-cache", () => ({
  buildCachedSystemMessages: (system: string) => [
    { role: "system", content: system },
  ],
}));

vi.mock("@/lib/ai/telemetry", () => ({
  recordAgentRun: recordAgentRunSpy,
}));

vi.mock("@/lib/ai/memory-extractor", () => ({
  extractAndStoreMemories: extractAndStoreMemoriesSpy,
}));

vi.mock("@/lib/ai/model", () => ({
  getAgentModel: getAgentModelSpy,
  getActiveModelId: getActiveModelIdSpy,
  isAgentModelConfigured: isAgentModelConfiguredSpy,
}));

vi.mock("@/lib/env", () => ({
  requireEnv: requireEnvSpy,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    info: logInfoSpy,
    error: logErrorSpy,
  },
}));

const { createAgentRouteHandler } = await import("./shared-route-handler");

const OK_USER = {
  id: "user-agent",
  email: "fresh@example.com",
  user_metadata: { full_name: "Fresh Analyst" },
} as unknown as User;

const OK_AUTH = {
  ok: true as const,
  user: OK_USER,
};

const OK_RATE = {
  limited: false,
  headers: {
    "X-RateLimit-Limit": "60",
    "X-RateLimit-Remaining": "59",
  },
  response: null,
};

interface TestContext {
  floor: string;
}

function makeRequest(body: unknown = {
  messages: [
    { role: "user", parts: [{ type: "text", text: "status check" }] },
  ],
}): Request {
  return new Request("https://www.interntower.com/api/cro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeHandler(): (req: Request) => Promise<Response> {
  return createAgentRouteHandler<TestContext>({
    agentKey: "cro",
    loadContext: async () => ({ floor: "war-room" }),
    buildSystemPrompt: (ctx, userName) => `${ctx.floor}:${userName}`,
    buildTools: () => ({}),
  });
}

describe("createAgentRouteHandler", () => {
  beforeEach(() => {
    streamTextSpy.mockReset();
    stepCountIsSpy.mockReset();
    convertToModelMessagesSpy.mockReset();
    requireUserSpy.mockReset();
    rateLimitSpy.mockReset();
    requireAgentAccessSpy.mockReset();
    getUserTierSpy.mockReset();
    consumeAiQuotaSpy.mockReset();
    getMemoriesForContextSpy.mockReset();
    recordAgentRunSpy.mockReset();
    extractAndStoreMemoriesSpy.mockReset();
    getAgentModelSpy.mockReset();
    getActiveModelIdSpy.mockReset();
    isAgentModelConfiguredSpy.mockReset();
    requireEnvSpy.mockReset();
    logInfoSpy.mockReset();
    logErrorSpy.mockReset();

    requireEnvSpy.mockImplementation(() => {
      throw new Error("Missing required environment variables: ANTHROPIC_API_KEY");
    });
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    requireAgentAccessSpy.mockResolvedValue(null);
    getUserTierSpy.mockResolvedValue("pro");
    consumeAiQuotaSpy.mockResolvedValue({ allowed: true, used: 1, cap: 200 });
    getMemoriesForContextSpy.mockResolvedValue([]);
    convertToModelMessagesSpy.mockImplementation(async (messages) => messages);
    stepCountIsSpy.mockImplementation((steps) => ({ steps }));
    getAgentModelSpy.mockReturnValue({ provider: "mock-model" });
    getActiveModelIdSpy.mockReturnValue("mock-model-id");
    isAgentModelConfiguredSpy.mockReturnValue(true);
    streamTextSpy.mockReturnValue({
      toUIMessageStreamResponse: () =>
        new Response("agent-stream", { status: 200 }),
    });
  });

  it("returns 401 before checking provider credentials", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    });
    isAgentModelConfiguredSpy.mockReturnValue(false);

    const res = await makeHandler()(makeRequest());

    expect(res.status).toBe(401);
    expect(isAgentModelConfiguredSpy).not.toHaveBeenCalled();
    expect(rateLimitSpy).not.toHaveBeenCalled();
    expect(streamTextSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid bodies before checking provider credentials", async () => {
    isAgentModelConfiguredSpy.mockReturnValue(false);

    const res = await makeHandler()(makeRequest({}));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "invalid body" });
    expect(isAgentModelConfiguredSpy).not.toHaveBeenCalled();
    expect(consumeAiQuotaSpy).not.toHaveBeenCalled();
    expect(streamTextSpy).not.toHaveBeenCalled();
  });

  it("returns 503 without consuming quota when no agent model provider is configured", async () => {
    isAgentModelConfiguredSpy.mockReturnValue(false);

    const res = await makeHandler()(makeRequest());

    expect(res.status).toBe(503);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("60");
    await expect(res.json()).resolves.toEqual({
      error: "ai_unavailable",
      message:
        "The Tower agent desk is temporarily unavailable. Try again in a minute.",
    });
    expect(consumeAiQuotaSpy).not.toHaveBeenCalled();
    expect(getAgentModelSpy).not.toHaveBeenCalled();
    expect(streamTextSpy).not.toHaveBeenCalled();
  });

  it("streams once auth, body, provider, and quota checks pass", async () => {
    const res = await makeHandler()(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("agent-stream");
    expect(isAgentModelConfiguredSpy).toHaveBeenCalledOnce();
    expect(getUserTierSpy).toHaveBeenCalledWith("user-agent");
    expect(consumeAiQuotaSpy).toHaveBeenCalledWith("user-agent", "pro");
    expect(getAgentModelSpy).toHaveBeenCalledOnce();
    expect(streamTextSpy).toHaveBeenCalledOnce();
  });

  it("records and alerts failed stream finishes", async () => {
    const res = await makeHandler()(makeRequest());
    expect(res.status).toBe(200);

    const options = streamTextSpy.mock.calls[0]?.[0] as {
      onFinish: (args: {
        text: string;
        usage: undefined;
        toolCalls: Array<{ toolName: string }>;
        toolResults: Array<{ toolName: string }>;
        finishReason: "error";
      }) => Promise<void>;
    };

    await options.onFinish({
      text: "",
      usage: undefined,
      toolCalls: [],
      toolResults: [],
      finishReason: "error",
    });

    expect(logErrorSpy).toHaveBeenCalledWith(
      "agent.finish_failed",
      expect.any(Error),
      { agent: "cro", userId: "user-agent", toolNames: "" },
    );
    expect(recordAgentRunSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: "cro",
        userId: "user-agent",
        status: "failed",
        error: "stream_finish_error",
      }),
    );
  });
});
