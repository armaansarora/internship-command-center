import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import { runFoundrySpriteAnimator } from "../index";
import { FoundryAssetPackManifestSchema } from "@/lib/artlab/sdk/asset-pack";
import { createFoundrySpriteMockVideoProvider } from "./mock-video-provider";
import { createFoundrySpriteMockLottieProvider } from "./mock-lottie-provider";

/**
 * Contract regression test for Critical 1: the manifest produced by
 * runFoundrySpriteAnimator MUST be acceptable to the strict
 * FoundryAssetPackManifestSchema. We DO NOT mock buildFoundryAssetPack here
 * — the real builder runs and validates the manifest. If the agent ever
 * emits the legacy flat shape (assetKind, sprite/lottie, qa,
 * integrationSnippet, __packDir), this test fails loudly.
 *
 * Only the upstream source pack reader is mocked, exactly as the production
 * daemon would not need to read disk in tests.
 */
async function solid(c: number): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: c, g: c, b: c, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

const ANCHOR_FIXTURE: { bytes: Buffer; hash: string } = {
  bytes: Buffer.alloc(0),
  hash: "0000000000000000",
};

vi.mock("@/lib/artlab/sdk/asset-pack", async () => {
  const actual = await vi.importActual<typeof import("@/lib/artlab/sdk/asset-pack")>(
    "@/lib/artlab/sdk/asset-pack",
  );
  return {
    ...actual,
    loadFoundryAssetPack: vi.fn(async () => ({
      packId: "char-otis-v3",
      packDir: "/tmp/foundry-strict-schema-test/char-otis-v3",
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

describe("sprite-animator strict-schema contract", () => {
  let dir: string;
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "foundry-strict-schema-"));
    ANCHOR_FIXTURE.bytes = await solid(50);
    ANCHOR_FIXTURE.hash = await computePerceptualHash(ANCHOR_FIXTURE.bytes);
  });

  it("sprite-format manifest passes FoundryAssetPackManifestSchema.parse", async () => {
    const result = await runFoundrySpriteAnimator(
      {
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        sourcePackId: "char-otis-v3",
        action: "idle",
        format: "sprite",
        requestedBy: "agent",
        frameCount: 12,
        fps: 12,
        motionCurve: "breathing-12fps",
        loops: true,
      },
      {
        video: createFoundrySpriteMockVideoProvider(),
        lottie: createFoundrySpriteMockLottieProvider(),
      },
      { runDir: dir, packsRoot: "/tmp/foundry-strict-schema-test", anchorBytesOverride: ANCHOR_FIXTURE.bytes },
    );
    // The result.manifest must already satisfy the strict schema — it was
    // built by the real buildFoundryAssetPack, so a second parse is a
    // defence-in-depth assertion that the contract holds.
    const reparsed = FoundryAssetPackManifestSchema.parse(result.manifest);
    expect(reparsed.kind).toBe("sprite-animation");
    expect(reparsed.agent).toBe("sprite-animator");
    expect(reparsed.canonRefs.characterId).toBe("otis");
  });

  it("lottie-format manifest passes FoundryAssetPackManifestSchema.parse", async () => {
    const result = await runFoundrySpriteAnimator(
      {
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        sourcePackId: "char-otis-v3",
        action: "idle",
        format: "lottie",
        requestedBy: "agent",
        frameCount: 12,
        fps: 12,
        motionCurve: "breathing-12fps",
        loops: true,
      },
      {
        video: createFoundrySpriteMockVideoProvider(),
        lottie: createFoundrySpriteMockLottieProvider(),
      },
      { runDir: dir, packsRoot: "/tmp/foundry-strict-schema-test", anchorBytesOverride: ANCHOR_FIXTURE.bytes },
    );
    const reparsed = FoundryAssetPackManifestSchema.parse(result.manifest);
    expect(reparsed.kind).toBe("sprite-animation");
    expect(reparsed.agent).toBe("sprite-animator");
    expect(reparsed.payload.files.some((f) => f.relPath === "lottie.json")).toBe(true);
  });
});
