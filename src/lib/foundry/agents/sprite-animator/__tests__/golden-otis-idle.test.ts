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

// Foundry-SDK Critical-1 fix: `buildFoundryAssetPack` is no longer mocked;
// the real strict-schema builder runs. The golden assertions now read the
// canonical on-disk artefacts (`pack/manifest.json` + `pack/payload/…`)
// that `createFoundryAssetPack` writes — same shape the production daemon
// publishes.
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

  it("produces 12 frame PNGs + manifest with sprite-animation shape", async () => {
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
    // Loose frame artefacts (written by the agent's pack-writer) remain
    // under `<runDir>/pack/frame-NNN.png`. The canonical, schema-validated
    // pack lives next to them at `<runDir>/pack/manifest.json` with
    // payload files under `<runDir>/pack/payload/…`.
    const looseFrames = readdirSync(join(dir, "pack")).filter((f) =>
      /^frame-\d{3}\.png$/.test(f),
    );
    expect(looseFrames).toHaveLength(12);
    const payloadFrames = readdirSync(join(dir, "pack", "payload")).filter((f) =>
      /^frame-\d{3}\.png$/.test(f),
    );
    expect(payloadFrames).toHaveLength(12);
    const manifest = JSON.parse(
      readFileSync(join(dir, "pack", "manifest.json"), "utf8"),
    ) as {
      kind: string;
      agent: string;
      payload: { files: Array<{ relPath: string }> };
    };
    expect(manifest.kind).toBe("sprite-animation");
    expect(manifest.agent).toBe("sprite-animator");
    expect(
      manifest.payload.files.filter((f) => /^frame-\d{3}\.png$/.test(f.relPath)),
    ).toHaveLength(12);
    // sequence.json carries the legacy fps/frame_count/loops/transitions
    // metadata that used to live on `manifest.sprite.*` — same data,
    // same source of truth, schema-respecting location.
    const sequence = JSON.parse(
      readFileSync(join(dir, "pack", "payload", "sequence.json"), "utf8"),
    ) as { frame_count: number; fps: number };
    expect(sequence.frame_count).toBe(12);
    expect(sequence.fps).toBe(12);
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
