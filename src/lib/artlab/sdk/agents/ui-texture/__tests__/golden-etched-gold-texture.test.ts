// src/lib/artlab/sdk/agents/ui-texture/__tests__/golden-etched-gold-texture.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runArtLabUiTextureCli } from "../cli";

vi.mock("@/lib/artlab/sdk/canon", () => ({
  loadArtLabIconographyRules: vi.fn().mockResolvedValue({
    strokeWidthPx: 1.5,
    cornerRadiusPx: 2,
    palette: ["#C9A84C"],
    viewBox: "0 0 24 24",
  }),
  loadArtLabTextureRules: vi.fn().mockResolvedValue({
    tileToleranceDeltaE: 50,
    targetResolutionPx: 64,
    normalMapStrength: 0.5,
  }),
}));

vi.mock("@/lib/artlab/sdk/asset-pack", () => ({
  buildArtLabAssetPack: vi.fn(async (manifest: Record<string, unknown>) => ({
    packId: "tex-golden",
    manifest,
  })),
}));

describe("golden etched-gold texture", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "artlab-ui-texture-golden-"));
  });

  it("produces a PNG and a normal-map PNG", async () => {
    await runArtLabUiTextureCli({
      name: "etched-gold-border",
      kind: "texture",
      tileMode: "repeat",
      runDir: dir,
      providerKind: "mock",
      seed: 1,
    });
    expect(existsSync(join(dir, "pack", "etched-gold-border.png"))).toBe(true);
    expect(
      existsSync(join(dir, "pack", "etched-gold-border.normal.png")),
    ).toBe(true);
  });
});
