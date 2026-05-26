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

describe("writeFoundryFloorPack (single-composite)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "foundry-floor-pack-"));
  });

  it("writes the composite PNG into per-time-state subdirs", async () => {
    const bytes = await solid(40);
    await writeFoundryFloorPack({
      runDir: dir,
      floorSlug: "war-room",
      variants: [
        {
          timeState: "morning",
          kind: "single-composite",
          layers: [
            { name: "composite", zIndex: 0, hasAlpha: false, bytes },
          ],
        },
      ],
    });
    expect(existsSync(join(dir, "pack", "morning", "composite.png"))).toBe(true);
  });

  it("writes no .tmp files after success", async () => {
    const bytes = await solid(40);
    await writeFoundryFloorPack({
      runDir: dir,
      floorSlug: "war-room",
      variants: [
        {
          timeState: "morning",
          kind: "single-composite",
          layers: [{ name: "composite", zIndex: 0, hasAlpha: false, bytes }],
        },
      ],
    });
    const all = readdirSync(join(dir, "pack", "morning"));
    expect(all.filter((f) => f.includes(".tmp"))).toEqual([]);
  });

  it("returns variantManifests carrying kind, relative path, and hash", async () => {
    const bytes = await solid(40);
    const result = await writeFoundryFloorPack({
      runDir: dir,
      floorSlug: "war-room",
      variants: [
        {
          timeState: "dusk",
          kind: "single-composite",
          layers: [{ name: "composite", zIndex: 0, hasAlpha: false, bytes }],
        },
      ],
    });
    expect(result.variantManifests).toHaveLength(1);
    expect(result.variantManifests[0]?.kind).toBe("single-composite");
    expect(result.variantManifests[0]?.layers[0]?.path).toBe(
      "dusk/composite.png",
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
          kind: "single-composite",
          layers: [{ name: "composite", zIndex: 0, hasAlpha: false, bytes }],
        },
      ],
    });
    const written = readFileSync(join(dir, "pack", "night", "composite.png"));
    expect(written.equals(bytes)).toBe(true);
  });

  it("rejects a variant with more than one layer (honest spec is single)", async () => {
    const bytes = await solid(40);
    await expect(
      writeFoundryFloorPack({
        runDir: dir,
        floorSlug: "war-room",
        variants: [
          {
            timeState: "morning",
            kind: "single-composite",
            layers: [
              { name: "composite", zIndex: 0, hasAlpha: false, bytes },
              { name: "composite", zIndex: 0, hasAlpha: false, bytes },
            ],
          },
        ],
      }),
    ).rejects.toThrow(/expected 1/);
  });
});
