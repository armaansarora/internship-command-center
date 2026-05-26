import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import { runFoundrySpriteAnimator } from "./index";
import { createFoundrySpriteMockVideoProvider } from "./__tests__/mock-video-provider";
import { createFoundrySpriteMockLottieProvider } from "./__tests__/mock-lottie-provider";

async function solid(c: number): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: c, g: c, b: c, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

// Critical 3 fix: the lottie identity gate compares the source pack's
// anchorPerceptualHash to embedded asset hashes. We compute the real
// hash of the test anchor bytes so the gate has something matchable.
const ANCHOR_FIXTURE: { bytes: Buffer; hash: string } = {
  bytes: Buffer.alloc(0),
  hash: "0000000000000000",
};

vi.mock("@/lib/foundry/asset-pack", () => ({
  buildFoundryAssetPack: vi.fn(async (manifest: Record<string, unknown>) => ({
    packId: "anim-pack-1",
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

describe("runFoundrySpriteAnimator", () => {
  let dir: string;
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "foundry-anim-agent-"));
    ANCHOR_FIXTURE.bytes = await solid(50);
    ANCHOR_FIXTURE.hash = await computePerceptualHash(ANCHOR_FIXTURE.bytes);
  });

  it("sprite format writes frames and returns sprite manifest", async () => {
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
      { runDir: dir, anchorBytesOverride: ANCHOR_FIXTURE.bytes },
    );
    const manifest = result.manifest as { sprite: { frames: unknown[]; fps: number } };
    expect(manifest.sprite.frames).toHaveLength(12);
    expect(manifest.sprite.fps).toBe(12);
    expect(existsSync(join(dir, "pack", "frame-000.png"))).toBe(true);
  });

  it("lottie format writes lottie.json and returns lottie manifest", async () => {
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
      { runDir: dir, anchorBytesOverride: ANCHOR_FIXTURE.bytes },
    );
    const manifest = result.manifest as { lottie: { durationMs: number }; qa: { failedGates: ReadonlyArray<string> } };
    expect(manifest.lottie.durationMs).toBeGreaterThan(0);
    expect(existsSync(join(dir, "pack", "lottie.json"))).toBe(true);
    // Critical 3: lottie-identity is now enforced; with matching anchor
    // bytes embedded by the mock the gate must pass.
    expect(manifest.qa.failedGates).not.toContain("lottie-identity");
  });

  it("manifest carries integration snippet text", async () => {
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
      { runDir: dir, anchorBytesOverride: ANCHOR_FIXTURE.bytes },
    );
    const manifest = result.manifest as { integrationSnippet: string };
    expect(manifest.integrationSnippet).toContain("<AnimatedSprite");
  });

  // Critical 3: the lottie path now FAILS when the embedded character art
  // diverges from the source pack's anchor — actionable error message.
  it("lottie format fails QA when the source pack's anchor hash does not match the lottie's embedded character art", async () => {
    // Override the loadFoundryAssetPack mock to return an anchor hash
    // that cannot match the embedded image (which is solid(50)).
    const { loadFoundryAssetPack } = await import("@/lib/foundry/asset-pack");
    vi.mocked(loadFoundryAssetPack).mockImplementationOnce(async () => ({
      packId: "char-otis-v3",
      manifest: {
        assetKind: "character",
        characterId: "otis",
        anchorImagePath: "anchor.png",
        anchorPerceptualHash: "5a5a5a5a5a5a5a5a",
      },
    }));
    await expect(
      runFoundrySpriteAnimator(
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
        { runDir: dir, anchorBytesOverride: ANCHOR_FIXTURE.bytes },
      ),
    ).rejects.toThrow(/lottie-identity/);
  });
});
