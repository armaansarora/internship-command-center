import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { runCutoutAndFeatherStage } from "./cutout-and-feather";
import type { CharacterVariantSprite } from "./variant-fan-out";

async function makeSyntheticSprite(): Promise<Buffer> {
  return await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 200, g: 200, b: 200, alpha: 1 } },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 32, height: 32, channels: 4, background: { r: 50, g: 50, b: 50, alpha: 1 } },
        }).png().toBuffer(),
        top: 16,
        left: 16,
      },
    ])
    .png()
    .toBuffer();
}

describe("cutout-and-feather stage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "foundry-cutout-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("processes every sprite and writes a PNG with alpha channel", async () => {
    const bytes = await makeSyntheticSprite();
    const sprites: CharacterVariantSprite[] = [
      { characterId: "sol-navarro", outfit: "regular", pose: "idle", bytes, widthPx: 64, heightPx: 64, prompt: "p" },
    ];
    const result = await runCutoutAndFeatherStage({ sprites, workDir: tmpDir });
    expect(result.processedSprites.length).toBe(1);
    const out = result.processedSprites[0]!;
    expect(existsSync(out.pngPath)).toBe(true);
    expect(statSync(out.pngPath).size).toBeGreaterThan(0);
    const meta = await sharp(out.pngPath).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it("reports a non-zero feathered alpha histogram", async () => {
    const bytes = await makeSyntheticSprite();
    const sprites: CharacterVariantSprite[] = [
      { characterId: "sol-navarro", outfit: "regular", pose: "idle", bytes, widthPx: 64, heightPx: 64, prompt: "p" },
    ];
    const result = await runCutoutAndFeatherStage({ sprites, workDir: tmpDir });
    expect(result.processedSprites[0]?.alphaSamples.totalOpaquePx).toBeGreaterThan(0);
  });
});
