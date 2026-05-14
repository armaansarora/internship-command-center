import { existsSync, mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  inspectCharacterSourceImage,
  prepareCharacterSpriteAsset,
  splitCharacterPoseSheet,
} from "@/lib/visual-assets/art-processing";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "tower-art-pipeline-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("character art processing", () => {
  it("inspects source quality and exports normalized masters plus retina derivatives", async () => {
    const dir = createTempDir();
    const sourcePath = join(dir, "source.png");
    const masterPath = join(dir, "masters", "regular", "idle.png");
    const defaultPath = join(dir, "staged", "idle.webp");
    const retina2xPath = join(dir, "staged", "idle@2x.webp");
    const retina3xPath = join(dir, "staged", "idle@3x.webp");
    const darkQaPath = join(dir, "qa", "idle-dark.png");
    const lightQaPath = join(dir, "qa", "idle-light.png");

    await sharp({
      create: {
        width: 64,
        height: 128,
        channels: 4,
        background: { r: 120, g: 40, b: 50, alpha: 0.9 },
      },
    })
      .png()
      .toFile(sourcePath);

    const inspection = await inspectCharacterSourceImage(sourcePath);
    expect(inspection).toMatchObject({
      width: 64,
      height: 128,
      longEdge: 128,
      hasAlpha: true,
    });
    expect(inspection.issues).toContain("source-long-edge-below-4096");

    const result = await prepareCharacterSpriteAsset({
      sourcePath,
      masterPath,
      stagedRenditionPaths: {
        default: defaultPath,
        retina2x: retina2xPath,
        retina3x: retina3xPath,
      },
      qaPreviewPaths: {
        dark: darkQaPath,
        light: lightQaPath,
      },
      displayFrame: { width: 40, height: 80 },
      masterLongEdge: 512,
    });

    expect(result.master).toMatchObject({ width: 256, height: 512 });
    expect(result.renditions.default).toMatchObject({ width: 40, height: 80 });
    expect(result.renditions.retina2x).toMatchObject({ width: 80, height: 160 });
    expect(result.renditions.retina3x).toMatchObject({ width: 120, height: 240 });
    expect(result.issues).toContain("source-upscaled-to-master");
    expect(existsSync(masterPath)).toBe(true);
    expect(existsSync(defaultPath)).toBe(true);
    expect(existsSync(retina2xPath)).toBe(true);
    expect(existsSync(retina3xPath)).toBe(true);
    expect(existsSync(darkQaPath)).toBe(true);
    expect(existsSync(lightQaPath)).toBe(true);
  });

  it("splits pose sheets into deterministic slot sources", async () => {
    const dir = createTempDir();
    const sheetPath = join(dir, "sheet.png");
    const idlePath = join(dir, "split", "idle.png");
    const greetingPath = join(dir, "split", "greeting.png");

    await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: {
            create: {
              width: 100,
              height: 100,
              channels: 4,
              background: { r: 100, g: 20, b: 20, alpha: 1 },
            },
          },
          left: 0,
          top: 0,
        },
        {
          input: {
            create: {
              width: 100,
              height: 100,
              channels: 4,
              background: { r: 20, g: 100, b: 20, alpha: 1 },
            },
          },
          left: 100,
          top: 0,
        },
      ])
      .png()
      .toFile(sheetPath);

    const outputs = await splitCharacterPoseSheet({
      sourcePath: sheetPath,
      crops: [
        {
          outputPath: idlePath,
          extract: { left: 0, top: 0, width: 100, height: 100 },
        },
        {
          outputPath: greetingPath,
          extract: { left: 100, top: 0, width: 100, height: 100 },
        },
      ],
    });

    expect(outputs).toEqual([
      { outputPath: idlePath, width: 100, height: 100 },
      { outputPath: greetingPath, width: 100, height: 100 },
    ]);
    expect(existsSync(idlePath)).toBe(true);
    expect(existsSync(greetingPath)).toBe(true);
  });
});
