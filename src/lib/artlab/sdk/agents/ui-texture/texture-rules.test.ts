// src/lib/artlab/sdk/agents/ui-texture/texture-rules.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { loadArtLabTextureRulesAdapter } from "./texture-rules";

vi.mock("@/lib/artlab/sdk/canon", () => ({
  loadArtLabTextureRules: vi.fn(),
}));

import { loadArtLabTextureRules } from "@/lib/artlab/sdk/canon";

describe("loadArtLabTextureRulesAdapter", () => {
  beforeEach(() => {
    vi.mocked(loadArtLabTextureRules).mockReset();
  });

  it("returns normalised rules", async () => {
    vi.mocked(loadArtLabTextureRules).mockResolvedValue({
      tileToleranceDeltaE: 6,
      targetResolutionPx: 1024,
      normalMapStrength: 0.7,
    });
    const out = await loadArtLabTextureRulesAdapter();
    expect(out.tileToleranceDeltaE).toBe(6);
    expect(out.targetResolutionPx).toBe(1024);
    expect(out.normalMapStrength).toBeCloseTo(0.7);
  });

  it("throws on missing rules", async () => {
    vi.mocked(loadArtLabTextureRules).mockResolvedValue(null);
    await expect(loadArtLabTextureRulesAdapter()).rejects.toThrow(/texture/i);
  });

  it("rejects negative normalMapStrength", async () => {
    vi.mocked(loadArtLabTextureRules).mockResolvedValue({
      tileToleranceDeltaE: 6,
      targetResolutionPx: 1024,
      normalMapStrength: -0.1,
    });
    await expect(loadArtLabTextureRulesAdapter()).rejects.toThrow(
      /normalMapStrength/,
    );
  });
});
