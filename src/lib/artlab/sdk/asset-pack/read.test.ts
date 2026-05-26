import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createArtLabAssetPack } from "./pack";
import { readArtLabAssetPack, loadArtLabAssetPack } from "./read";

const VALID_INPUT = (packDir: string) => ({
  packDir,
  kind: "character-sprite" as const,
  agent: "character-master" as const,
  canonRefs: { characterId: "sol-navarro", paletteRef: "tower-default", typographyRef: null, motionLanguageRef: null },
  dimensions: { sourceWidthPx: 2400, sourceHeightPx: 4096, displayWidthPx: 160, displayHeightPx: 280, aspectRatio: "9:16" as const },
  colorTokensUsed: ["primaryDark"],
  intendedSlot: { slotId: "lobby/otis/regular/idle", appPath: "public/art/lobby/otis/regular/idle.webp", component: "OtisCharacter", requiresGsap: false },
  gsapCues: [],
  accessibility: { altText: "x", role: "img" as const, prefersReducedMotionStrategy: "static-fallback" as const },
  integrationSnippetTemplate: "character-sprite-img",
  payloadFiles: [{ relPath: "idle.webp", bytes: Buffer.from("payload-bytes") }],
  primaryFileRelPath: "idle.webp",
  generation: { agentName: "character-master" as const, provider: "x", modelId: "x", seed: 0, costCents: 0, durationMs: 0, generatedAt: "2026-05-25T00:00:00.000Z" },
});

describe("readArtLabAssetPack", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "artlab-read-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reads a pack created by createArtLabAssetPack", async () => {
    await createArtLabAssetPack(VALID_INPUT(tmpDir));
    const result = await readArtLabAssetPack(tmpDir);
    if (result.ok !== true) throw new Error("expected ok=true");
    expect(result.manifest.kind).toBe("character-sprite");
    expect(result.payloadBytes["idle.webp"].toString()).toBe("payload-bytes");
  });

  it("returns ok=false when manifest.json is missing", async () => {
    const result = await readArtLabAssetPack(tmpDir);
    expect(result.ok).toBe(false);
  });

  it("returns ok=false when payload bytes don't match manifest sha256", async () => {
    await createArtLabAssetPack(VALID_INPUT(tmpDir));
    writeFileSync(join(tmpDir, "payload", "idle.webp"), Buffer.from("TAMPERED"));
    const result = await readArtLabAssetPack(tmpDir);
    if (result.ok === true) throw new Error("expected ok=false");
    expect(result.code).toBe("payload-sha256-mismatch");
  });
});

describe("loadArtLabAssetPack", () => {
  let packsRoot: string;

  beforeEach(() => {
    packsRoot = mkdtempSync(join(tmpdir(), "artlab-packs-root-"));
  });

  afterEach(() => {
    rmSync(packsRoot, { recursive: true, force: true });
  });

  it("loads a real pack written by createArtLabAssetPack and returns parsed manifest + packDir", async () => {
    const packDir = join(packsRoot, "char-sol-v1");
    mkdirSync(packDir, { recursive: true });
    await createArtLabAssetPack(VALID_INPUT(packDir));
    const loaded = await loadArtLabAssetPack(packsRoot, "char-sol-v1");
    expect(loaded).not.toBeNull();
    if (!loaded) return;
    expect(loaded.packId).toBe("char-sol-v1");
    expect(loaded.packDir).toBe(packDir);
    expect(loaded.manifest.kind).toBe("character-sprite");
    expect(loaded.manifest.canonRefs.characterId).toBe("sol-navarro");
  });

  it("returns null when the pack directory does not exist", async () => {
    const loaded = await loadArtLabAssetPack(packsRoot, "does-not-exist");
    expect(loaded).toBeNull();
  });

  it("throws an actionable error when manifest.json is missing", async () => {
    const packDir = join(packsRoot, "no-manifest");
    mkdirSync(packDir, { recursive: true });
    await expect(loadArtLabAssetPack(packsRoot, "no-manifest")).rejects.toThrow(
      /manifest\.json/,
    );
  });

  it("throws an actionable error when manifest.json is malformed JSON", async () => {
    const packDir = join(packsRoot, "bad-json");
    mkdirSync(packDir, { recursive: true });
    writeFileSync(join(packDir, "manifest.json"), "{not valid json");
    await expect(loadArtLabAssetPack(packsRoot, "bad-json")).rejects.toThrow(
      /manifest.*JSON/i,
    );
  });

  it("throws an actionable error when manifest fails strict schema validation", async () => {
    const packDir = join(packsRoot, "bad-schema");
    mkdirSync(packDir, { recursive: true });
    writeFileSync(
      join(packDir, "manifest.json"),
      JSON.stringify({ packId: "bad-schema", but: "not the schema" }),
    );
    await expect(loadArtLabAssetPack(packsRoot, "bad-schema")).rejects.toThrow(
      /manifest/i,
    );
  });

  it("refuses pack ids that would escape packsRoot via traversal", async () => {
    await expect(loadArtLabAssetPack(packsRoot, "../escape")).rejects.toThrow(
      /pack id/i,
    );
    await expect(loadArtLabAssetPack(packsRoot, "")).rejects.toThrow(/pack id/i);
    await expect(loadArtLabAssetPack(packsRoot, "/abs")).rejects.toThrow(/pack id/i);
  });
});
