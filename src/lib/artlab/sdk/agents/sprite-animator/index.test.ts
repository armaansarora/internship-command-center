import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
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

const MOCK_PACK_DIR = "/tmp/foundry-anim-test/char-otis-v3";

// Foundry-SDK Critical-1 fix: the `buildFoundryAssetPack` mock has been
// REMOVED. The real strict-schema builder now runs against the manifest
// the sprite-animator produces, so any drift between the agent's emitted
// shape and the canonical envelope (Critical-1 contract bug) fails this
// suite immediately rather than only blowing up in production.
//
// We continue to mock `loadFoundryAssetPack` because it touches disk; it
// returns the same strict on-disk character-spritesheet manifest shape
// that `character-master` writes.
vi.mock("@/lib/artlab/sdk/asset-pack", async () => {
  const actual = await vi.importActual<typeof import("@/lib/artlab/sdk/asset-pack")>(
    "@/lib/artlab/sdk/asset-pack",
  );
  return {
    ...actual,
    loadFoundryAssetPack: vi.fn(async () => ({
      packId: "char-otis-v3",
      packDir: MOCK_PACK_DIR,
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

describe("runFoundrySpriteAnimator", () => {
  let dir: string;
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "foundry-anim-agent-"));
    ANCHOR_FIXTURE.bytes = await solid(50);
    ANCHOR_FIXTURE.hash = await computePerceptualHash(ANCHOR_FIXTURE.bytes);
  });

  it("sprite format writes frames and returns sprite-animation manifest", async () => {
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
      { runDir: dir, packsRoot: "/tmp/foundry-anim-test", anchorBytesOverride: ANCHOR_FIXTURE.bytes },
    );
    // Canonical manifest carries all sprite frames as payload files. The
    // sequence metadata (fps, loops, frame_count, …) is persisted as
    // `sequence.json` inside the payload so it round-trips through the
    // strict schema without smuggling extra top-level fields.
    expect(result.manifest.kind).toBe("sprite-animation");
    expect(result.manifest.agent).toBe("sprite-animator");
    expect(result.manifest.canonRefs.characterId).toBe("otis");
    expect(
      result.manifest.payload.files.filter((f) => /^frame-\d{3}\.png$/.test(f.relPath)).length,
    ).toBe(12);
    expect(
      result.manifest.payload.files.some((f) => f.relPath === "sequence.json"),
    ).toBe(true);
    const sequencePath = join(dir, "pack", "payload", "sequence.json");
    const sequence = JSON.parse(readFileSync(sequencePath, "utf8")) as {
      frames: unknown[];
      fps: number;
      frame_count: number;
    };
    expect(sequence.frames).toHaveLength(12);
    expect(sequence.fps).toBe(12);
    expect(sequence.frame_count).toBe(12);
    expect(existsSync(join(dir, "pack", "frame-000.png"))).toBe(true);
  });

  it("lottie format writes lottie.json and returns sprite-animation manifest", async () => {
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
      { runDir: dir, packsRoot: "/tmp/foundry-anim-test", anchorBytesOverride: ANCHOR_FIXTURE.bytes },
    );
    expect(result.manifest.kind).toBe("sprite-animation");
    expect(result.manifest.payload.primaryFileRelPath).toBe("lottie.json");
    expect(existsSync(join(dir, "pack", "lottie.json"))).toBe(true);
    const qaPath = join(dir, "pack", "payload", "qa.json");
    const qa = JSON.parse(readFileSync(qaPath, "utf8")) as {
      failedGates: string[];
    };
    // Critical 3: lottie-identity is now enforced; with matching anchor
    // bytes embedded by the mock the gate must pass.
    expect(qa.failedGates).not.toContain("lottie-identity");
  });

  it("integration.tsx payload carries the integration snippet text", async () => {
    await runFoundrySpriteAnimator(
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
      { runDir: dir, packsRoot: "/tmp/foundry-anim-test", anchorBytesOverride: ANCHOR_FIXTURE.bytes },
    );
    const snippet = readFileSync(join(dir, "pack", "payload", "integration.tsx"), "utf8");
    expect(snippet).toContain("<AnimatedSprite");
  });

  // Critical 3: the lottie path now FAILS when the embedded character art
  // diverges from the source pack's anchor — actionable error message.
  it("lottie format fails QA when the source pack's anchor hash does not match the lottie's embedded character art", async () => {
    // Override the loadFoundryAssetPack mock to return an anchor hash
    // that cannot match the embedded image (which is solid(50)).
    const { loadFoundryAssetPack } = await import("@/lib/artlab/sdk/asset-pack");
    vi.mocked(loadFoundryAssetPack).mockImplementationOnce(async () => ({
      packId: "char-otis-v3",
      packDir: MOCK_PACK_DIR,
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
        { runDir: dir, packsRoot: "/tmp/foundry-anim-test", anchorBytesOverride: ANCHOR_FIXTURE.bytes },
      ),
    ).rejects.toThrow(/lottie-identity/);
  });
});
