import { describe, expect, it } from "vitest";
import { FoundryAssetPackManifestSchema } from "./manifest.schema";

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
    files: [
      { relPath: "idle.webp", sha256: "0".repeat(64), bytes: 14600 },
    ],
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
};

describe("FoundryAssetPackManifestSchema", () => {
  it("accepts a valid manifest", () => {
    expect(() => FoundryAssetPackManifestSchema.parse(VALID_MANIFEST)).not.toThrow();
  });

  it("rejects when manifestVersion is wrong", () => {
    expect(() =>
      FoundryAssetPackManifestSchema.parse({ ...VALID_MANIFEST, manifestVersion: "0.9.0" }),
    ).toThrow();
  });

  it("rejects when payload has no primary file", () => {
    expect(() =>
      FoundryAssetPackManifestSchema.parse({
        ...VALID_MANIFEST,
        payload: { files: [], primaryFileRelPath: "x.webp" },
      }),
    ).toThrow();
  });

  it("rejects when sha256 is not 64 hex chars", () => {
    expect(() =>
      FoundryAssetPackManifestSchema.parse({
        ...VALID_MANIFEST,
        payload: {
          files: [{ relPath: "idle.webp", sha256: "short-hash", bytes: 1 }],
          primaryFileRelPath: "idle.webp",
        },
      }),
    ).toThrow();
  });

  it("rejects when intendedSlot.appPath escapes the public/ tree", () => {
    expect(() =>
      FoundryAssetPackManifestSchema.parse({
        ...VALID_MANIFEST,
        intendedSlot: { ...VALID_MANIFEST.intendedSlot, appPath: "../../etc/passwd" },
      }),
    ).toThrow();
  });

  it("rejects when an asset kind has no canon refs and is not allowed to", () => {
    expect(() =>
      FoundryAssetPackManifestSchema.parse({
        ...VALID_MANIFEST,
        canonRefs: { characterId: null, paletteRef: null, typographyRef: null, motionLanguageRef: null },
      }),
    ).toThrow();
  });
});
