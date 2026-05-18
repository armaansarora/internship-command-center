import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { extractSolidMatteAlpha, inspectSolidMatteAlphaReadiness } from "./index";

describe("solid matte alpha extraction", () => {
  it("turns a flat chroma matte into true alpha without resizing the source", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-alpha-matte-"));
    const source = join(root, "source.png");
    const output = join(root, "transparent.png");

    mkdirSync(root, { recursive: true });
    const pixels = Buffer.alloc(8 * 8 * 3);

    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const offset = ((y * 8) + x) * 3;
        const inSubject = x >= 2 && x <= 5 && y >= 2 && y <= 5;

        pixels[offset] = inSubject ? 160 : 0;
        pixels[offset + 1] = inSubject ? 32 : 255;
        pixels[offset + 2] = inSubject ? 32 : 0;
      }
    }

    await sharp(pixels, { raw: { width: 8, height: 8, channels: 3 } }).png().toFile(source);

    const report = await extractSolidMatteAlpha({
      sourcePath: source,
      outputPath: output,
      matteColor: "#00ff00",
      tolerance: 8,
      softness: 32,
      borderSamplePixels: 1,
    });
    const metadata = await sharp(output).metadata();
    const raw = await sharp(output).raw().ensureAlpha().toBuffer();

    expect(report.width).toBe(8);
    expect(report.height).toBe(8);
    expect(metadata.width).toBe(8);
    expect(metadata.height).toBe(8);
    expect(metadata.hasAlpha).toBe(true);
    expect(raw[3]).toBe(0);
    expect(raw[((3 * 8) + 3) * 4 + 3]).toBe(255);
  });

  it("rejects checkerboard or busy backgrounds instead of producing low-quality cutouts", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-alpha-matte-bad-"));
    const source = join(root, "checker.png");
    const output = join(root, "transparent.png");
    const pixels = Buffer.alloc(8 * 8 * 3);

    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const offset = ((y * 8) + x) * 3;
        const green = (x + y) % 2 === 0;
        pixels[offset] = green ? 0 : 120;
        pixels[offset + 1] = green ? 255 : 120;
        pixels[offset + 2] = green ? 0 : 120;
      }
    }

    await sharp(pixels, { raw: { width: 8, height: 8, channels: 3 } }).png().toFile(source);

    await expect(extractSolidMatteAlpha({
      sourcePath: source,
      outputPath: output,
      matteColor: "#00ff00",
      tolerance: 8,
      softness: 32,
    })).rejects.toThrow("matte background is not flat");
  });

  it("reports whether a source is safe for chroma matte alpha repair before extraction", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-alpha-matte-readiness-"));
    const safeSource = join(root, "safe.png");
    const unsafeSource = join(root, "unsafe.jpg");

    mkdirSync(root, { recursive: true });
    await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: "#00ff00",
      },
    }).png().toFile(safeSource);
    await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: "#ccaa66",
      },
    }).jpeg().toFile(unsafeSource);

    const safe = await inspectSolidMatteAlphaReadiness({
      sourcePath: safeSource,
      matteColor: "#00ff00",
      borderSamplePixels: 2,
    });
    const unsafe = await inspectSolidMatteAlphaReadiness({
      sourcePath: unsafeSource,
      matteColor: "#00ff00",
      borderSamplePixels: 2,
    });

    expect(safe.safe).toBe(true);
    expect(safe.borderMatchRatio).toBe(1);
    expect(unsafe.safe).toBe(false);
    expect(unsafe.reason).toContain("not flat");
  });
});
