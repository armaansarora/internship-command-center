import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: "Pipeline analysis complete. 3 follow-ups needed.",
    toolCalls: [],
    usage: { promptTokens: 500, completionTokens: 200 },
  }),
  tool: vi.fn((opts) => opts),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn().mockReturnValue("mock-model"),
}));

vi.mock("@/lib/agents/logger", () => ({
  agentLogger: {
    start: vi.fn().mockResolvedValue("log-1"),
    complete: vi.fn().mockResolvedValue(undefined),
    fail: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/agents/event-bus", () => ({
  eventBus: { publish: vi.fn() },
}));

vi.mock("@/lib/agents/cro/tools", () => ({
  queryApplications: vi.fn().mockResolvedValue([]),
  updateApplicationStatus: vi.fn().mockResolvedValue({ success: true }),
  suggestFollowUp: vi.fn().mockResolvedValue({ outreachId: "out-1" }),
  analyzeConversionRates: vi.fn().mockResolvedValue({ totalApplications: 10, byStatus: {}, conversionRates: {} }),
}));

describe("CRO Agent", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("exports a croAgent function", async () => {
    const mod = await import("@/lib/agents/cro");
    expect(mod.croAgent).toBeDefined();
  });
});
