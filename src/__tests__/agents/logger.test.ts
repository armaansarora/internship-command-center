import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "log123" }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

describe("agentLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should be importable with start and complete methods", async () => {
    const { agentLogger } = await import("@/lib/agents/logger");
    expect(agentLogger).toBeDefined();
    expect(typeof agentLogger.start).toBe("function");
    expect(typeof agentLogger.complete).toBe("function");
    expect(typeof agentLogger.fail).toBe("function");
  });
});
