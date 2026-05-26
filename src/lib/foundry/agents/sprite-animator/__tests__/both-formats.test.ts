import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import { runFoundrySpriteAnimatorCli } from "../cli";

async function solid(c: number): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: c, g: c, b: c, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

// Critical 3: anchor hash must match the embedded image hash so the
// lottie-identity gate has something matchable.
const ANCHOR_FIXTURE: { bytes: Buffer; hash: string } = {
  bytes: Buffer.alloc(0),
  hash: "0000000000000000",
};

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
      anchorPerceptualHash: ANCHOR_FIXTURE.hash,
    },
  })),
}));

describe("sprite-animator both formats for the same character", () => {
  let spriteDir: string;
  let lottieDir: string;
  beforeEach(async () => {
    spriteDir = mkdtempSync(join(tmpdir(), "foundry-anim-sprite-"));
    lottieDir = mkdtempSync(join(tmpdir(), "foundry-anim-lottie-"));
    ANCHOR_FIXTURE.bytes = await solid(50);
    ANCHOR_FIXTURE.hash = await computePerceptualHash(ANCHOR_FIXTURE.bytes);
  });

  it("produces two different packs with the same sourcePackId", async () => {
    const spriteResult = await runFoundrySpriteAnimatorCli({
      sourcePackId: "char-otis-v3",
      action: "idle",
      format: "sprite",
      runDir: spriteDir,
      providerKind: "mock",
      seed: 1,
      anchorBytesOverride: ANCHOR_FIXTURE.bytes,
    });
    const lottieResult = await runFoundrySpriteAnimatorCli({
      sourcePackId: "char-otis-v3",
      action: "idle",
      format: "lottie",
      runDir: lottieDir,
      providerKind: "mock",
      seed: 1,
      anchorBytesOverride: ANCHOR_FIXTURE.bytes,
    });
    expect(spriteResult.packId).not.toBe(lottieResult.packId);
    expect(existsSync(join(spriteDir, "pack", "frame-000.png"))).toBe(true);
    expect(existsSync(join(lottieDir, "pack", "lottie.json"))).toBe(true);
  });
});
