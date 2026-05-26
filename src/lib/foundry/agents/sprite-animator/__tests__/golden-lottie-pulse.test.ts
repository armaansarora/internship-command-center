import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
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
    packId: "lottie-golden",
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

describe("golden lottie pulse", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "foundry-lottie-golden-"));
  });

  it("produces a parseable lottie.json", async () => {
    const anchorBytes = await solid(50);
    await runFoundrySpriteAnimatorCli({
      sourcePackId: "char-otis-v3",
      action: "idle",
      format: "lottie",
      runDir: dir,
      providerKind: "mock",
      seed: 1,
      anchorBytesOverride: anchorBytes,
    });
    expect(existsSync(join(dir, "pack", "lottie.json"))).toBe(true);
    const raw = readFileSync(join(dir, "pack", "lottie.json"), "utf8");
    const parsed = JSON.parse(raw) as { v: string; layers: unknown[] };
    expect(parsed.v).toBe("5.7.0");
    expect(parsed.layers.length).toBeGreaterThan(0);
  });
});
