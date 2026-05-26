import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
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
      anchorPerceptualHash: "0000000000000000",
    },
  })),
}));

describe("runFoundrySpriteAnimator", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "foundry-anim-agent-"));
  });

  it("sprite format writes frames and returns sprite manifest", async () => {
    const anchorBytes = await solid(50);
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
      { runDir: dir, anchorBytesOverride: anchorBytes },
    );
    const manifest = result.manifest as { sprite: { frames: unknown[]; fps: number } };
    expect(manifest.sprite.frames).toHaveLength(12);
    expect(manifest.sprite.fps).toBe(12);
    expect(existsSync(join(dir, "pack", "frame-000.png"))).toBe(true);
  });

  it("lottie format writes lottie.json and returns lottie manifest", async () => {
    const anchorBytes = await solid(50);
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
      { runDir: dir, anchorBytesOverride: anchorBytes },
    );
    const manifest = result.manifest as { lottie: { durationMs: number } };
    expect(manifest.lottie.durationMs).toBeGreaterThan(0);
    expect(existsSync(join(dir, "pack", "lottie.json"))).toBe(true);
  });

  it("manifest carries integration snippet text", async () => {
    const anchorBytes = await solid(50);
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
      { runDir: dir, anchorBytesOverride: anchorBytes },
    );
    const manifest = result.manifest as { integrationSnippet: string };
    expect(manifest.integrationSnippet).toContain("<AnimatedSprite");
  });
});
