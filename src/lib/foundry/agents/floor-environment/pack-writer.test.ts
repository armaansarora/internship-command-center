import { describe, expect, it, beforeEach } from "vitest";
import sharp from "sharp";
import { mkdtempSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFoundryFloorPack } from "./pack-writer";

async function solid(c: number): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: c, g: c, b: c, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

describe("writeFoundryFloorPack", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "foundry-floor-pack-"));
  });

  it("writes layer PNGs into per-time-state subdirs", async () => {
    const bytes = await solid(40);
    await writeFoundryFloorPack({
      runDir: dir,
      floorSlug: "war-room",
      variants: [
        {
          timeState: "morning",
          layers: [
            { name: "background", zIndex: 0, hasAlpha: false, bytes },
            { name: "midground", zIndex: 1, hasAlpha: true, bytes },
            { name: "ambient", zIndex: 2, hasAlpha: true, bytes },
          ],
        },
      ],
    });
    expect(existsSync(join(dir, "pack", "morning", "background.png"))).toBe(true);
    expect(existsSync(join(dir, "pack", "morning", "midground.png"))).toBe(true);
    expect(existsSync(join(dir, "pack", "morning", "ambient.png"))).toBe(true);
  });

  it("writes no .tmp files after success", async () => {
    const bytes = await solid(40);
    await writeFoundryFloorPack({
      runDir: dir,
      floorSlug: "war-room",
      variants: [
        {
          timeState: "morning",
          layers: [
            { name: "background", zIndex: 0, hasAlpha: false, bytes },
            { name: "midground", zIndex: 1, hasAlpha: true, bytes },
            { name: "ambient", zIndex: 2, hasAlpha: true, bytes },
          ],
        },
      ],
    });
    const all = readdirSync(join(dir, "pack", "morning"));
    expect(all.filter((f) => f.includes(".tmp"))).toEqual([]);
  });

  it("returns variantManifests carrying relative paths and hashes", async () => {
    const bytes = await solid(40);
    const result = await writeFoundryFloorPack({
      runDir: dir,
      floorSlug: "war-room",
      variants: [
        {
          timeState: "dusk",
          layers: [
            { name: "background", zIndex: 0, hasAlpha: false, bytes },
            { name: "midground", zIndex: 1, hasAlpha: true, bytes },
            { name: "ambient", zIndex: 2, hasAlpha: true, bytes },
          ],
        },
      ],
    });
    expect(result.variantManifests).toHaveLength(1);
    expect(result.variantManifests[0]?.layers[0]?.path).toBe(
      "dusk/background.png",
    );
    expect(result.variantManifests[0]?.perceptualHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("preserves PNG bytes through the write", async () => {
    const bytes = await solid(123);
    await writeFoundryFloorPack({
      runDir: dir,
      floorSlug: "war-room",
      variants: [
        {
          timeState: "night",
          layers: [
            { name: "background", zIndex: 0, hasAlpha: false, bytes },
            { name: "midground", zIndex: 1, hasAlpha: true, bytes },
            { name: "ambient", zIndex: 2, hasAlpha: true, bytes },
          ],
        },
      ],
    });
    const written = readFileSync(join(dir, "pack", "night", "background.png"));
    expect(written.equals(bytes)).toBe(true);
  });
});
