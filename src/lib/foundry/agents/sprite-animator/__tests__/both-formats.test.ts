import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { runFoundrySpriteAnimatorCli } from "../cli";

async function solid(c: number): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: c, g: c, b: c, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

vi.mock("@/lib/foundry/asset-pack", () => ({
  buildFoundryAssetPack: vi.fn(async (manifest: Record<string, unknown>) => ({
    packId: `pack-${(manifest as { assetKind: string }).assetKind}`,
    manifest,
  })),
  loadFoundryAssetPack: vi.fn(async () => ({
    packId: "char-otis-v3",
    manifest: {
      assetKind: "character",
      characterId: "otis",
      anchorImagePath: "anchor.png",
      anchorPerceptualHash: "0000000000000000",
    },
  })),
}));

describe("sprite-animator both formats for the same character", () => {
  let spriteDir: string;
  let lottieDir: string;
  beforeEach(() => {
    spriteDir = mkdtempSync(join(tmpdir(), "foundry-anim-sprite-"));
    lottieDir = mkdtempSync(join(tmpdir(), "foundry-anim-lottie-"));
  });

  it("produces two different packs with the same sourcePackId", async () => {
    const anchorBytes = await solid(50);
    const spriteResult = await runFoundrySpriteAnimatorCli({
      sourcePackId: "char-otis-v3",
      action: "idle",
      format: "sprite",
      runDir: spriteDir,
      providerKind: "mock",
      seed: 1,
      anchorBytesOverride: anchorBytes,
    });
    const lottieResult = await runFoundrySpriteAnimatorCli({
      sourcePackId: "char-otis-v3",
      action: "idle",
      format: "lottie",
      runDir: lottieDir,
      providerKind: "mock",
      seed: 1,
      anchorBytesOverride: anchorBytes,
    });
    expect(spriteResult.packId).not.toBe(lottieResult.packId);
    expect(existsSync(join(spriteDir, "pack", "frame-000.png"))).toBe(true);
    expect(existsSync(join(lottieDir, "pack", "lottie.json"))).toBe(true);
  });
});
