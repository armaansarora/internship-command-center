// src/lib/foundry/agents/ui-texture/icon-rules.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { loadFoundryIconRulesAdapter } from "./icon-rules";

vi.mock("@/lib/artlab/sdk/canon", () => ({
  loadFoundryIconographyRules: vi.fn(),
}));

import { loadFoundryIconographyRules } from "@/lib/artlab/sdk/canon";

describe("loadFoundryIconRulesAdapter", () => {
  beforeEach(() => {
    vi.mocked(loadFoundryIconographyRules).mockReset();
  });

  it("returns the rules with strokeWidthTolerance defaulted", async () => {
    vi.mocked(loadFoundryIconographyRules).mockResolvedValue({
      strokeWidthPx: 1.5,
      cornerRadiusPx: 2,
      palette: ["#C9A84C", "#1A1A2E"],
      viewBox: "0 0 24 24",
    });
    const out = await loadFoundryIconRulesAdapter();
    expect(out.strokeWidthPx).toBe(1.5);
    expect(out.strokeWidthTolerancePx).toBeGreaterThan(0);
    expect(out.viewBox).toBe("0 0 24 24");
  });

  it("throws when canon returns null", async () => {
    vi.mocked(loadFoundryIconographyRules).mockResolvedValue(null);
    await expect(loadFoundryIconRulesAdapter()).rejects.toThrow(/icon/i);
  });
});
