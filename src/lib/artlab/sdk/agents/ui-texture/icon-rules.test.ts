// src/lib/artlab/sdk/agents/ui-texture/icon-rules.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { loadArtLabIconRulesAdapter } from "./icon-rules";

vi.mock("@/lib/artlab/sdk/canon", () => ({
  loadArtLabIconographyRules: vi.fn(),
}));

import { loadArtLabIconographyRules } from "@/lib/artlab/sdk/canon";

describe("loadArtLabIconRulesAdapter", () => {
  beforeEach(() => {
    vi.mocked(loadArtLabIconographyRules).mockReset();
  });

  it("returns the rules with strokeWidthTolerance defaulted", async () => {
    vi.mocked(loadArtLabIconographyRules).mockResolvedValue({
      strokeWidthPx: 1.5,
      cornerRadiusPx: 2,
      palette: ["#C9A84C", "#1A1A2E"],
      viewBox: "0 0 24 24",
    });
    const out = await loadArtLabIconRulesAdapter();
    expect(out.strokeWidthPx).toBe(1.5);
    expect(out.strokeWidthTolerancePx).toBeGreaterThan(0);
    expect(out.viewBox).toBe("0 0 24 24");
  });

  it("throws when canon returns null", async () => {
    vi.mocked(loadArtLabIconographyRules).mockResolvedValue(null);
    await expect(loadArtLabIconRulesAdapter()).rejects.toThrow(/icon/i);
  });
});
