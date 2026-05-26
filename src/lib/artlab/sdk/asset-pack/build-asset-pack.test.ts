import { describe, expect, it } from "vitest";
import { buildFoundryAssetPack } from "./build-asset-pack";

const VALID_MANIFEST = {
  manifestVersion: "1.0.0",
  packId: "pack-01970000-0000-7000-8000-000000000001",
  kind: "character-sprite",
  agent: "character-master",
  canonRefs: {
    characterId: "sol-navarro",
    paletteRef: "tower-default",
    typographyRef: null,
    motionLanguageRef: null,
  },
  dimensions: {
    sourceWidthPx: 2400,
    sourceHeightPx: 4096,
    displayWidthPx: 160,
    displayHeightPx: 280,
    aspectRatio: "9:16",
  },
  colorTokensUsed: ["primaryDark", "goldAccent"],
  intendedSlot: {
    slotId: "lobby/otis/regular/idle",
    appPath: "public/art/lobby/otis/regular/idle.webp",
    component: "OtisCharacter",
    requiresGsap: false,
  },
  gsapCues: [],
  accessibility: {
    altText: "Otis the concierge in his regular uniform, idle pose",
    role: "img",
    prefersReducedMotionStrategy: "static-fallback",
  },
  integrationSnippetTemplate: "character-sprite-img",
  payload: {
    files: [{ relPath: "idle.webp", sha256: "a".repeat(64), bytes: 14600 }],
    primaryFileRelPath: "idle.webp",
  },
  generation: {
    agentName: "character-master",
    provider: "gemini-2.5-flash-image",
    modelId: "gemini-2.5-flash-image",
    seed: 1234,
    costCents: 4,
    durationMs: 18000,
    generatedAt: "2026-05-25T00:00:00.000Z",
  },
} as const;

describe("buildFoundryAssetPack", () => {
  it("returns a packId + validated manifest for a fully conformant input", async () => {
    const built = await buildFoundryAssetPack(structuredClone(VALID_MANIFEST));
    expect(typeof built.packId).toBe("string");
    expect(built.packId.length).toBeGreaterThan(0);
    expect(built.manifest.kind).toBe("character-sprite");
  });

  it("rejects a manifest with a bogus sha256 (security regression — was previously accepted)", async () => {
    const bogus = {
      ...VALID_MANIFEST,
      payload: {
        files: [{ relPath: "idle.webp", sha256: "not-a-real-hash", bytes: 1 }],
        primaryFileRelPath: "idle.webp",
      },
    };
    await expect(buildFoundryAssetPack(bogus)).rejects.toThrow();
  });

  it("rejects a manifest whose intendedSlot.appPath escapes the allow-listed prefixes", async () => {
    const traversal = {
      ...VALID_MANIFEST,
      intendedSlot: {
        ...VALID_MANIFEST.intendedSlot,
        appPath: "../../etc/passwd",
      },
    };
    await expect(buildFoundryAssetPack(traversal)).rejects.toThrow();
  });

  it("rejects a manifest missing all canon refs", async () => {
    const noRefs = {
      ...VALID_MANIFEST,
      canonRefs: {
        characterId: null,
        paletteRef: null,
        typographyRef: null,
        motionLanguageRef: null,
      },
    };
    await expect(buildFoundryAssetPack(noRefs)).rejects.toThrow();
  });

  it("rejects a manifest with an unknown extra property (strict mode)", async () => {
    const extra = {
      ...VALID_MANIFEST,
      __packDir: "/tmp/some-attacker-controlled-dir",
    };
    await expect(buildFoundryAssetPack(extra)).rejects.toThrow();
  });
});
