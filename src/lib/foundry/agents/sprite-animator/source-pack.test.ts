import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveFoundrySpriteSourcePack } from "./source-pack";

vi.mock("@/lib/foundry/asset-pack", () => ({
  loadFoundryAssetPack: vi.fn(),
}));

import { loadFoundryAssetPack } from "@/lib/foundry/asset-pack";

describe("resolveFoundrySpriteSourcePack", () => {
  beforeEach(() => {
    vi.mocked(loadFoundryAssetPack).mockReset();
  });

  it("returns the anchor PNG path and perceptual hash", async () => {
    vi.mocked(loadFoundryAssetPack).mockResolvedValue({
      packId: "char-otis-v3",
      manifest: {
        assetKind: "character",
        characterId: "otis",
        anchorImagePath: "otis-anchor.png",
        anchorPerceptualHash: "0123456789abcdef",
      },
    });
    const out = await resolveFoundrySpriteSourcePack("char-otis-v3");
    expect(out.characterId).toBe("otis");
    expect(out.anchorImagePath).toBe("otis-anchor.png");
    expect(out.anchorPerceptualHash).toBe("0123456789abcdef");
  });

  it("throws when source pack is not a character", async () => {
    vi.mocked(loadFoundryAssetPack).mockResolvedValue({
      packId: "p1",
      manifest: { assetKind: "ui-icon", name: "x", icon: {} },
    });
    await expect(resolveFoundrySpriteSourcePack("p1")).rejects.toThrow(
      /character/i,
    );
  });

  it("throws when source pack is missing anchorImagePath", async () => {
    vi.mocked(loadFoundryAssetPack).mockResolvedValue({
      packId: "p1",
      manifest: { assetKind: "character", characterId: "otis" },
    });
    await expect(resolveFoundrySpriteSourcePack("p1")).rejects.toThrow(
      /anchor/i,
    );
  });
});
