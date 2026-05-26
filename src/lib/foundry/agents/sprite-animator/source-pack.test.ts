import { describe, expect, it, vi, beforeEach } from "vitest";
import { join } from "node:path";
import { resolveFoundrySpriteSourcePack } from "./source-pack";
import {
  FOUNDRY_PACK_PAYLOAD_DIR,
  type FoundryAssetPackManifest,
  type LoadedFoundryAssetPack,
} from "@/lib/foundry/asset-pack";

vi.mock("@/lib/foundry/asset-pack", async () => {
  const actual = await vi.importActual<typeof import("@/lib/foundry/asset-pack")>(
    "@/lib/foundry/asset-pack",
  );
  return {
    ...actual,
    loadFoundryAssetPack: vi.fn(),
  };
});

import { loadFoundryAssetPack } from "@/lib/foundry/asset-pack";

// A baseline strict-schema-conformant character-spritesheet manifest. Tests
// override individual fields to exercise specific guard paths so the rest
// of the manifest remains valid and the failure reason is unambiguous.
function baselineCharacterPack(): LoadedFoundryAssetPack {
  const packDir = "/tmp/foundry-test/char-otis-v3";
  const manifest: FoundryAssetPackManifest = {
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

describe("resolveFoundrySpriteSourcePack", () => {
  beforeEach(() => {
    vi.mocked(loadFoundryAssetPack).mockReset();
  });

  it("returns the resolved anchor PNG path and perceptual hash from a real character pack manifest", async () => {
    const pack = baselineCharacterPack();
    vi.mocked(loadFoundryAssetPack).mockResolvedValue(pack);
    const out = await resolveFoundrySpriteSourcePack("char-otis-v3", {
      packsRoot: "/tmp/foundry-test",
    });
    expect(out.characterId).toBe("otis");
    // The resolver joins packDir + payload dir + anchorImageRelPath so
    // consumers get an absolute filesystem path they can readFile() on.
    expect(out.anchorImagePath).toBe(
      join(pack.packDir, FOUNDRY_PACK_PAYLOAD_DIR, "regular/idle.webp"),
    );
    expect(out.anchorPerceptualHash).toBe("0123456789abcdef");
  });

  it("throws when source pack is not a character-spritesheet", async () => {
    const pack = baselineCharacterPack();
    const manifest = { ...pack.manifest, kind: "ui-icon" as const, agent: "ui-icon" as const };
    vi.mocked(loadFoundryAssetPack).mockResolvedValue({ ...pack, manifest });
    await expect(
      resolveFoundrySpriteSourcePack("p1", { packsRoot: "/tmp/foundry-test" }),
    ).rejects.toThrow(/character-spritesheet/i);
  });

  it("throws when canonRefs.characterId is null on a character-spritesheet pack", async () => {
    const pack = baselineCharacterPack();
    const manifest = {
      ...pack.manifest,
      canonRefs: { ...pack.manifest.canonRefs, characterId: null },
    };
    vi.mocked(loadFoundryAssetPack).mockResolvedValue({ ...pack, manifest });
    await expect(
      resolveFoundrySpriteSourcePack("p1", { packsRoot: "/tmp/foundry-test" }),
    ).rejects.toThrow(/characterId/i);
  });

  it("throws when the source pack cannot be located", async () => {
    vi.mocked(loadFoundryAssetPack).mockResolvedValue(null);
    await expect(
      resolveFoundrySpriteSourcePack("missing", { packsRoot: "/tmp/foundry-test" }),
    ).rejects.toThrow(/not found/i);
  });
});
