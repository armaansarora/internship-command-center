import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      headline: "Morning Briefing: 3 action items",
      sections: [{
        department: "cro",
        title: "Pipeline Status",
        content: "Pipeline is healthy.",
        highlights: ["3 follow-ups needed"],
        pendingActions: [],
      }],
    }),
    usage: { inputTokens: 400, outputTokens: 300 },
  }),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn().mockReturnValue("mock-model"),
}));

vi.mock("@/lib/agents/logger", () => ({
  agentLogger: {
    start: vi.fn().mockResolvedValue("log-briefing"),
    complete: vi.fn(),
  },
}));

vi.mock("@/lib/agents/event-bus", () => ({
  eventBus: { publish: vi.fn() },
}));

vi.mock("@/lib/agents/notification-router", () => ({
  routeNotification: vi.fn().mockResolvedValue("notif-1"),
}));

describe("Briefing Compiler", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("exports compileBriefing function", async () => {
    const mod = await import("@/lib/agents/ceo/compile-briefing");
    expect(mod.compileBriefing).toBeDefined();
  });
});
