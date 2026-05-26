// src/lib/foundry/agents/ui-texture/texture-rules.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { loadFoundryTextureRulesAdapter } from "./texture-rules";

vi.mock("@/lib/foundry/canon", () => ({
  loadFoundryTextureRules: vi.fn(),
}));

import { loadFoundryTextureRules } from "@/lib/foundry/canon";

describe("loadFoundryTextureRulesAdapter", () => {
  beforeEach(() => {
    vi.mocked(loadFoundryTextureRules).mockReset();
  });

  it("returns normalised rules", async () => {
    vi.mocked(loadFoundryTextureRules).mockResolvedValue({
      tileToleranceDeltaE: 6,
      targetResolutionPx: 1024,
      normalMapStrength: 0.7,
    });
    const out = await loadFoundryTextureRulesAdapter();
    expect(out.tileToleranceDeltaE).toBe(6);
    expect(out.targetResolutionPx).toBe(1024);
    expect(out.normalMapStrength).toBeCloseTo(0.7);
  });

  it("throws on missing rules", async () => {
    vi.mocked(loadFoundryTextureRules).mockResolvedValue(null);
    await expect(loadFoundryTextureRulesAdapter()).rejects.toThrow(/texture/i);
  });

  it("rejects negative normalMapStrength", async () => {
    vi.mocked(loadFoundryTextureRules).mockResolvedValue({
      tileToleranceDeltaE: 6,
      targetResolutionPx: 1024,
      normalMapStrength: -0.1,
    });
    await expect(loadFoundryTextureRulesAdapter()).rejects.toThrow(
      /normalMapStrength/,
    );
  });
});
