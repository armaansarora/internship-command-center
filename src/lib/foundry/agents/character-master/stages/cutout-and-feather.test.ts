import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, statSync, readFileSync } from "node:fs";
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

  it("reuses the shared artlab cutout primitives (reuse-rule guard)", () => {
    // Static-source guard: this stage MUST consume the canonical primitives
    // from `@/lib/artlab/runners/cutout-primitives` rather than reimplement
    // flood-fill / classify-alpha locally. If anyone re-introduces an
    // in-module `knockoutNeutralBackdrop`, `floodFillBackdrop`, or
    // `classifyAlpha` function, this test fails loudly.
    const source = readFileSync(join(__dirname, "cutout-and-feather.ts"), "utf8");
    expect(source).toContain('from "@/lib/artlab/runners/cutout-primitives"');
    expect(source).not.toMatch(/function\s+knockoutNeutralBackdrop/);
    expect(source).not.toMatch(/function\s+floodFillBackdrop/);
    expect(source).not.toMatch(/function\s+classifyAlpha/);
    // Smoking-gun guard: no dead `void FEATHER_THRESHOLD_DARK` reference.
    expect(source).not.toContain("FEATHER_THRESHOLD_DARK");
  });

  it("flood-fills the perimeter backdrop and reports an opaque subject region", async () => {
    // Use a backdrop with very clear separation so the shared flood-fill
    // primitive marks the perimeter transparent and the central square opaque.
    const bytes = await sharp({
      create: { width: 96, height: 96, channels: 4, background: { r: 240, g: 235, b: 220, alpha: 1 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 48, height: 48, channels: 4, background: { r: 30, g: 30, b: 60, alpha: 1 } },
          }).png().toBuffer(),
          top: 24,
          left: 24,
        },
      ])
      .png()
      .toBuffer();
    const sprites: CharacterVariantSprite[] = [
      { characterId: "sol-navarro", outfit: "regular", pose: "idle", bytes, widthPx: 96, heightPx: 96, prompt: "p" },
    ];
    const result = await runCutoutAndFeatherStage({ sprites, workDir: tmpDir });
    const out = result.processedSprites[0]!;
    expect(out.alphaSamples.totalOpaquePx).toBeGreaterThan(0);
    expect(out.alphaSamples.totalTransparentPx).toBeGreaterThan(0);
    expect(typeof out.noisyBackdropWarning).toBe("boolean");
  });
});
