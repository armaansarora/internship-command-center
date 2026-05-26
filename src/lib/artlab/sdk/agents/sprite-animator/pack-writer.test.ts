import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  writeFoundrySpritePack,
  writeFoundryLottiePack,
} from "./pack-writer";

async function solid(c: number): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: c, g: c, b: c, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

describe("writeFoundrySpritePack", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "foundry-sprite-pack-"));
  });

  it("writes a zero-padded PNG per frame", async () => {
    const frames = await Promise.all([solid(50), solid(60), solid(70)]);
    const result = await writeFoundrySpritePack({
      runDir: dir,
      characterId: "otis",
      action: "idle",
      frames,
    });
    expect(existsSync(join(dir, "pack", "frame-000.png"))).toBe(true);
    expect(existsSync(join(dir, "pack", "frame-001.png"))).toBe(true);
    expect(existsSync(join(dir, "pack", "frame-002.png"))).toBe(true);
    expect(result.frameManifests).toHaveLength(3);
  });

  it("frame manifests carry index + relative path + perceptualHash", async () => {
    const frames = await Promise.all([solid(50), solid(60)]);
    const result = await writeFoundrySpritePack({
      runDir: dir,
      characterId: "otis",
      action: "idle",
      frames,
    });
    expect(result.frameManifests[0]?.index).toBe(0);
    expect(result.frameManifests[0]?.path).toBe("frame-000.png");
    expect(result.frameManifests[0]?.perceptualHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("no .tmp files remain after success", async () => {
    const frames = await Promise.all([solid(50), solid(60)]);
    await writeFoundrySpritePack({
      runDir: dir,
      characterId: "otis",
      action: "idle",
      frames,
    });
    expect(readdirSync(join(dir, "pack")).filter((f) => f.includes(".tmp"))).toEqual([]);
  });
});

describe("writeFoundryLottiePack", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "foundry-lottie-pack-"));
  });

  it("writes a single lottie.json", async () => {
    const lottieJson = JSON.stringify({ v: "5.7.0" });
    const result = await writeFoundryLottiePack({
      runDir: dir,
      characterId: "otis",
      action: "idle",
      lottieJson,
    });
    expect(existsSync(join(dir, "pack", "lottie.json"))).toBe(true);
    expect(readFileSync(join(dir, "pack", "lottie.json"), "utf8")).toBe(lottieJson);
    expect(result.lottiePath).toBe("lottie.json");
  });
});
