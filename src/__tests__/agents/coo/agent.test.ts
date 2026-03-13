import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: "Email processing complete. 2 emails classified, 1 interview scheduled.",
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

vi.mock("@/lib/agents/coo/tools", () => ({
  fetchRecentEmails: vi.fn().mockResolvedValue({ emails: [] }),
  classifyEmail: vi
    .fn()
    .mockResolvedValue({
      classification: "other",
      urgency: "medium",
      alreadyProcessed: false,
    }),
  createCalendarEvent: vi
    .fn()
    .mockResolvedValue({ googleEventId: "gcal-1", htmlLink: "https://..." }),
  updateApplicationFromEmail: vi
    .fn()
    .mockResolvedValue({ success: true }),
}));

describe("COO Agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports a cooAgent function", async () => {
    const mod = await import("@/lib/agents/coo");
    expect(mod.cooAgent).toBeDefined();
  });
});
