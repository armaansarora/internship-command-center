import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync, readdirSync, readFileSync } from "node:fs";
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

vi.mock("@/lib/foundry/asset-pack", async () => {
  return {
    buildFoundryAssetPack: vi.fn(async (manifest: Record<string, unknown>) => {
      const { writeFileSync, mkdirSync } = await import("node:fs");
      const { join: pathJoin } = await import("node:path");
      const dir = (manifest as { __packDir?: string }).__packDir ?? "/tmp";
      mkdirSync(dir, { recursive: true });
      writeFileSync(pathJoin(dir, "manifest.json"), JSON.stringify(manifest));
      return { packId: "anim-golden", manifest };
    }),
    loadFoundryAssetPack: vi.fn(async () => ({
      packId: "char-otis-v3",
      manifest: {
        assetKind: "character",
        characterId: "otis",
        anchorImagePath: "anchor.png",
        anchorPerceptualHash: "0000000000000000",
      },
    })),
  };
});

describe("golden otis idle", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "foundry-anim-golden-"));
  });

  it("produces 12 frame PNGs + manifest with sprite shape", async () => {
    const anchorBytes = await solid(50);
    await runFoundrySpriteAnimatorCli({
      sourcePackId: "char-otis-v3",
      action: "idle",
      format: "sprite",
      runDir: dir,
      providerKind: "mock",
      seed: 1,
      anchorBytesOverride: anchorBytes,
    });
    const files = readdirSync(join(dir, "pack")).filter((f) =>
      f.endsWith(".png"),
    );
    expect(files).toHaveLength(12);
    const manifest = JSON.parse(
      readFileSync(join(dir, "pack", "manifest.json"), "utf8"),
    ) as { sprite: { frame_count: number; fps: number } };
    expect(manifest.sprite.frame_count).toBe(12);
    expect(manifest.sprite.fps).toBe(12);
  });

  it("dry-run prints validated without writing artefacts", async () => {
    const out = await runFoundrySpriteAnimatorCli({
      sourcePackId: "char-otis-v3",
      action: "idle",
      format: "sprite",
      runDir: dir,
      providerKind: "mock",
      seed: 1,
      dryRun: true,
    });
    expect(out.summary).toContain("validated");
    expect(existsSync(join(dir, "pack"))).toBe(false);
  });
});
