import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { runCompositeJudgeStage } from "./composite-judge";
import type { ProcessedSprite } from "./cutout-and-feather";

async function patternSprite(
  left: { r: number; g: number; b: number },
  right: { r: number; g: number; b: number },
): Promise<Buffer> {
  const w = 64;
  const h = 64;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const c = x < w / 2 ? left : right;
      buf[i] = c.r;
      buf[i + 1] = c.g;
      buf[i + 2] = c.b;
      buf[i + 3] = 255;
    }
  }
  return await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

describe("composite-judge stage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "artlab-judge-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("passes when all sprites resemble the anchor", async () => {
    const anchorBytes = await patternSprite({ r: 50, g: 50, b: 50 }, { r: 200, g: 200, b: 200 });
    const anchorPath = join(tmpDir, "anchor.png");
    writeFileSync(anchorPath, anchorBytes);
    const sprites: ProcessedSprite[] = [];
    for (const pose of ["idle", "greeting"]) {
      const b = await patternSprite({ r: 50, g: 50, b: 50 }, { r: 200, g: 200, b: 200 });
      const p = join(tmpDir, `regular__${pose}.png`);
      writeFileSync(p, b);
      sprites.push({
        characterId: "sol-navarro",
        outfit: "regular",
        pose,
        pngPath: p,
        alphaSamples: { totalOpaquePx: 4096, totalSemiTransparentPx: 0, totalTransparentPx: 0, edgeFeatherAvgAlpha: 255 },
        noisyBackdropWarning: false,
      });
    }
    const result = await runCompositeJudgeStage({ anchorPath, sprites });
    expect(result.ok).toBe(true);
  });

  it("fails with actionable reason when a sprite drifts hard against anchor", async () => {
    const anchorBytes = await patternSprite({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    const anchorPath = join(tmpDir, "anchor.png");
    writeFileSync(anchorPath, anchorBytes);
    const driftedBytes = await patternSprite({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 });
    const p = join(tmpDir, "regular__alert.png");
    writeFileSync(p, driftedBytes);
    const sprites: ProcessedSprite[] = [
      {
        characterId: "sol-navarro",
        outfit: "regular",
        pose: "alert",
        pngPath: p,
        alphaSamples: { totalOpaquePx: 4096, totalSemiTransparentPx: 0, totalTransparentPx: 0, edgeFeatherAvgAlpha: 255 },
        noisyBackdropWarning: false,
      },
    ];
    const result = await runCompositeJudgeStage({ anchorPath, sprites });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.reason).toMatch(/drift/i);
      expect(result.failure.offendingSpriteRef?.outfit).toBe("regular");
      expect(result.failure.offendingSpriteRef?.pose).toBe("alert");
    }
  });
});
