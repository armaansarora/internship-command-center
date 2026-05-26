import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
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
// lottie-identity gate has something matchable.
const ANCHOR_FIXTURE: { bytes: Buffer; hash: string } = {
  bytes: Buffer.alloc(0),
  hash: "0000000000000000",
};

// Foundry-SDK Critical-1 fix: `buildFoundryAssetPack` is no longer mocked;
// the real strict-schema builder runs and would reject any drift from the
// canonical envelope. Only `loadFoundryAssetPack` is stubbed because it
// reads disk.
vi.mock("@/lib/foundry/asset-pack", async () => {
  const actual = await vi.importActual<typeof import("@/lib/foundry/asset-pack")>(
    "@/lib/foundry/asset-pack",
  );
  return {
    ...actual,
    loadFoundryAssetPack: vi.fn(async () => ({
      packId: "char-otis-v3",
      packDir: "/tmp/foundry-test/char-otis-v3",
      manifest: {
        manifestVersion: "1.0.0",
        packId: "char-otis-v3",
        kind: "character-spritesheet",
        agent: "character-master",
        canonRefs: { characterId: "otis", paletteRef: "tower-default", typographyRef: null, motionLanguageRef: null },
        dimensions: { sourceWidthPx: 2400, sourceHeightPx: 4096, displayWidthPx: 160, displayHeightPx: 280, aspectRatio: "9:16" },
        colorTokensUsed: ["primaryDark"],
        intendedSlot: { slotId: "lobby/otis/regular/idle", appPath: "public/art/lobby/otis/regular/idle.webp", component: "OtisCharacter", requiresGsap: false },
        gsapCues: [],
        accessibility: { altText: "x", role: "img", prefersReducedMotionStrategy: "static-fallback" },
        integrationSnippetTemplate: "character-sprite-img",
        payload: { files: [{ relPath: "regular/idle.webp", sha256: "0".repeat(64), bytes: 1 }], primaryFileRelPath: "regular/idle.webp" },
        generation: { agentName: "character-master", provider: "x", modelId: "x", seed: 0, costCents: 0, durationMs: 0, generatedAt: "2026-05-25T00:00:00.000Z" },
        anchorImageRelPath: "regular/idle.webp",
        anchorPerceptualHash: ANCHOR_FIXTURE.hash,
      },
    })),
  };
});

describe("sprite-animator both formats for the same character", () => {
  let spriteDir: string;
  let lottieDir: string;
  beforeEach(async () => {
    spriteDir = mkdtempSync(join(tmpdir(), "foundry-anim-sprite-"));
    lottieDir = mkdtempSync(join(tmpdir(), "foundry-anim-lottie-"));
    ANCHOR_FIXTURE.bytes = await solid(50);
    ANCHOR_FIXTURE.hash = await computePerceptualHash(ANCHOR_FIXTURE.bytes);
  });

  it("produces two different packs with the same sourcePackId", async () => {
    const spriteResult = await runFoundrySpriteAnimatorCli({
      sourcePackId: "char-otis-v3",
      action: "idle",
      format: "sprite",
      runDir: spriteDir,
      providerKind: "mock",
      seed: 1,
      anchorBytesOverride: ANCHOR_FIXTURE.bytes,
    });
    const lottieResult = await runFoundrySpriteAnimatorCli({
      sourcePackId: "char-otis-v3",
      action: "idle",
      format: "lottie",
      runDir: lottieDir,
      providerKind: "mock",
      seed: 1,
      anchorBytesOverride: ANCHOR_FIXTURE.bytes,
    });
    expect(spriteResult.packId).not.toBe(lottieResult.packId);
    expect(existsSync(join(spriteDir, "pack", "frame-000.png"))).toBe(true);
    expect(existsSync(join(lottieDir, "pack", "lottie.json"))).toBe(true);
  });
});
