import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/agents/logger", () => ({
  agentLogger: {
    start: vi.fn().mockResolvedValue("log-ceo"),
    complete: vi.fn(),
    fail: vi.fn(),
  },
}));

vi.mock("@/lib/agents/event-bus", () => ({
  eventBus: { publish: vi.fn() },
}));

describe("CEO Agent", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("exports ceoOrchestrator function", async () => {
    const mod = await import("@/lib/agents/ceo");
    expect(mod.ceoOrchestrator).toBeDefined();
  });
});
