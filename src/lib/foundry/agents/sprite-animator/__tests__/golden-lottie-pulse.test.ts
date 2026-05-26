import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import { runFoundrySpriteAnimatorCli } from "../cli";

async function solid(c: number): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: c, g: c, b: c, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

// Critical 3: anchor hash must match the embedded image hash so the
// lottie-identity gate passes.
const ANCHOR_FIXTURE: { bytes: Buffer; hash: string } = {
  bytes: Buffer.alloc(0),
  hash: "0000000000000000",
};

vi.mock("@/lib/foundry/asset-pack", () => ({
  buildFoundryAssetPack: vi.fn(async (manifest: Record<string, unknown>) => ({
    packId: "lottie-golden",
    manifest,
  })),
  loadFoundryAssetPack: vi.fn(async () => ({
    packId: "char-otis-v3",
    manifest: {
      assetKind: "character",
      characterId: "otis",
      anchorImagePath: "anchor.png",
      anchorPerceptualHash: ANCHOR_FIXTURE.hash,
    },
  })),
}));

describe("golden lottie pulse", () => {
  let dir: string;
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "foundry-lottie-golden-"));
    ANCHOR_FIXTURE.bytes = await solid(50);
    ANCHOR_FIXTURE.hash = await computePerceptualHash(ANCHOR_FIXTURE.bytes);
  });

  it("produces a parseable lottie.json with embedded identity asset", async () => {
    await runFoundrySpriteAnimatorCli({
      sourcePackId: "char-otis-v3",
      action: "idle",
      format: "lottie",
      runDir: dir,
      providerKind: "mock",
      seed: 1,
      anchorBytesOverride: ANCHOR_FIXTURE.bytes,
    });
    expect(existsSync(join(dir, "pack", "lottie.json"))).toBe(true);
    const raw = readFileSync(join(dir, "pack", "lottie.json"), "utf8");
    const parsed = JSON.parse(raw) as {
      v: string;
      layers: unknown[];
      assets: Array<{ id: string; p: string }>;
    };
    expect(parsed.v).toBe("5.7.0");
    expect(parsed.layers.length).toBeGreaterThan(0);
    // Critical 3: identity-bearing asset must be embedded for the gate
    // to have something to verify against the source pack anchor.
    expect(parsed.assets.length).toBeGreaterThan(0);
    expect(parsed.assets[0]?.p).toContain("data:image/png;base64,");
  });
});
