// src/lib/artlab/sdk/agents/ui-texture/pack-writer.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  writeArtLabUiIconPack,
  writeArtLabUiTexturePack,
} from "./pack-writer";

async function solid(c: number): Promise<Buffer> {
  return sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: c, g: c, b: c } },
  })
    .png()
    .toBuffer();
}

describe("writeArtLabUiIconPack", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "artlab-ui-icon-pack-"));
  });

  it("writes the SVG and returns a relative manifest path", async () => {
    const result = await writeArtLabUiIconPack({
      runDir: dir,
      name: "elevator-door",
      svg: "<svg/>",
    });
    expect(existsSync(join(dir, "pack", "elevator-door.svg"))).toBe(true);
    expect(result.svgPath).toBe("elevator-door.svg");
  });

  it("writes no .tmp leftovers", async () => {
    await writeArtLabUiIconPack({
      runDir: dir,
      name: "elevator-door",
      svg: "<svg/>",
    });
    expect(
      readdirSync(join(dir, "pack")).filter((f) => f.includes(".tmp")),
    ).toEqual([]);
  });
});

describe("writeArtLabUiTexturePack", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "artlab-ui-texture-pack-"));
  });

  it("writes both the source PNG and the normal-map PNG", async () => {
    const png = await solid(120);
    const normal = await solid(128);
    const result = await writeArtLabUiTexturePack({
      runDir: dir,
      name: "etched-gold-border",
      pngBytes: png,
      normalMapBytes: normal,
    });
    expect(existsSync(join(dir, "pack", "etched-gold-border.png"))).toBe(true);
    expect(
      existsSync(join(dir, "pack", "etched-gold-border.normal.png")),
    ).toBe(true);
    expect(result.pngPath).toBe("etched-gold-border.png");
    expect(result.normalMapPath).toBe("etched-gold-border.normal.png");
  });

  it("preserves byte contents through the write", async () => {
    const png = await solid(80);
    const normal = await solid(120);
    await writeArtLabUiTexturePack({
      runDir: dir,
      name: "x",
      pngBytes: png,
      normalMapBytes: normal,
    });
    expect(readFileSync(join(dir, "pack", "x.png")).equals(png)).toBe(true);
    expect(
      readFileSync(join(dir, "pack", "x.normal.png")).equals(normal),
    ).toBe(true);
  });
});
