import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: "Company research complete. Acme Corp profile saved.",
    toolCalls: [],
    usage: { inputTokens: 800, outputTokens: 300 },
  }),
  tool: vi.fn((opts) => opts),
  zodSchema: vi.fn((schema) => schema),
  stepCountIs: vi.fn((n) => ({ type: "step-count", count: n })),
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

vi.mock("@/lib/agents/cio/tools", () => ({
  searchCompany: vi.fn().mockResolvedValue({ results: [] }),
  scrapeUrl: vi.fn().mockResolvedValue({ content: "", metadata: {} }),
  lookupSecFilings: vi.fn().mockResolvedValue({ filings: [] }),
  getEconomicData: vi.fn().mockResolvedValue({ observations: [] }),
  upsertCompany: vi
    .fn()
    .mockResolvedValue({ companyId: "comp-1", created: true }),
}));

describe("CIO Agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports a cioAgent function", async () => {
    const mod = await import("@/lib/agents/cio");
    expect(mod.cioAgent).toBeDefined();
  });
});
