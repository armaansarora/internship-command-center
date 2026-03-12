import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue({ ids: ["evt-1"] }) },
}));

describe("POST /api/agents/bell", () => {
  it("exports a POST handler", async () => {
    const mod = await import("@/app/api/agents/bell/route");
    expect(mod.POST).toBeDefined();
  });
});
