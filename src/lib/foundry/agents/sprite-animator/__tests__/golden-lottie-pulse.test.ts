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

// Foundry-SDK Critical-1 fix: `buildFoundryAssetPack` is no longer mocked;
// the real strict-schema builder validates the manifest the agent emits.
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
    // The canonical pack also writes lottie.json under payload/, so the
    // schema-validated manifest references real bytes round-tripped via
    // createFoundryAssetPack.
    expect(existsSync(join(dir, "pack", "payload", "lottie.json"))).toBe(true);
  });
});
