import { describe, expect, it, vi, beforeEach } from "vitest";
import { join } from "node:path";
import { resolveArtLabSpriteSourcePack } from "./source-pack";
import {
  ARTLAB_PACK_PAYLOAD_DIR,
  type ArtLabAssetPackManifest,
  type LoadedArtLabAssetPack,
} from "@/lib/artlab/sdk/asset-pack";

vi.mock("@/lib/artlab/sdk/asset-pack", async () => {
  const actual = await vi.importActual<typeof import("@/lib/artlab/sdk/asset-pack")>(
    "@/lib/artlab/sdk/asset-pack",
  );
  return {
    ...actual,
    loadArtLabAssetPack: vi.fn(),
  };
});

import { loadArtLabAssetPack } from "@/lib/artlab/sdk/asset-pack";

// A baseline strict-schema-conformant character-spritesheet manifest. Tests
// override individual fields to exercise specific guard paths so the rest
// of the manifest remains valid and the failure reason is unambiguous.
function baselineCharacterPack(): LoadedArtLabAssetPack {
  const packDir = "/tmp/artlab-test/char-otis-v3";
  const manifest: ArtLabAssetPackManifest = {
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
    payload: {
      files: [{ relPath: "regular/idle.webp", sha256: "0".repeat(64), bytes: 14600 }],
      primaryFileRelPath: "regular/idle.webp",
    },
    generation: { agentName: "character-master", provider: "x", modelId: "x", seed: 0, costCents: 0, durationMs: 0, generatedAt: "2026-05-25T00:00:00.000Z" },
    anchorImageRelPath: "regular/idle.webp",
    anchorPerceptualHash: "0123456789abcdef",
  };
  return { packId: "char-otis-v3", packDir, manifest };
}

describe("resolveArtLabSpriteSourcePack", () => {
  beforeEach(() => {
    vi.mocked(loadArtLabAssetPack).mockReset();
  });

  it("returns the resolved anchor PNG path and perceptual hash from a real character pack manifest", async () => {
    const pack = baselineCharacterPack();
    vi.mocked(loadArtLabAssetPack).mockResolvedValue(pack);
    const out = await resolveArtLabSpriteSourcePack("char-otis-v3", {
      packsRoot: "/tmp/artlab-test",
    });
    expect(out.characterId).toBe("otis");
    // The resolver joins packDir + payload dir + anchorImageRelPath so
    // consumers get an absolute filesystem path they can readFile() on.
    expect(out.anchorImagePath).toBe(
      join(pack.packDir, ARTLAB_PACK_PAYLOAD_DIR, "regular/idle.webp"),
    );
    expect(out.anchorPerceptualHash).toBe("0123456789abcdef");
  });

  it("throws when source pack is not a character-spritesheet", async () => {
    const pack = baselineCharacterPack();
    const manifest = { ...pack.manifest, kind: "ui-icon" as const, agent: "ui-icon" as const };
    vi.mocked(loadArtLabAssetPack).mockResolvedValue({ ...pack, manifest });
    await expect(
      resolveArtLabSpriteSourcePack("p1", { packsRoot: "/tmp/artlab-test" }),
    ).rejects.toThrow(/character-spritesheet/i);
  });

  it("throws when canonRefs.characterId is null on a character-spritesheet pack", async () => {
    const pack = baselineCharacterPack();
    const manifest = {
      ...pack.manifest,
      canonRefs: { ...pack.manifest.canonRefs, characterId: null },
    };
    vi.mocked(loadArtLabAssetPack).mockResolvedValue({ ...pack, manifest });
    await expect(
      resolveArtLabSpriteSourcePack("p1", { packsRoot: "/tmp/artlab-test" }),
    ).rejects.toThrow(/characterId/i);
  });

  it("throws when the source pack cannot be located", async () => {
    vi.mocked(loadArtLabAssetPack).mockResolvedValue(null);
    await expect(
      resolveArtLabSpriteSourcePack("missing", { packsRoot: "/tmp/artlab-test" }),
    ).rejects.toThrow(/not found/i);
  });
});
