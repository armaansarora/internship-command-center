import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFoundryAssetPack } from "./pack";
import { sha256OfBytes } from "./hashing";

describe("createFoundryAssetPack", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "foundry-pack-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes a manifest.json + payload files atomically", async () => {
    const bytes = Buffer.from("fake-png-bytes");
    const expectedHash = sha256OfBytes(bytes);
    const pack = await createFoundryAssetPack({
      packDir: tmpDir,
      kind: "character-sprite",
      agent: "character-master",
      canonRefs: { characterId: "sol-navarro", paletteRef: "tower-default", typographyRef: null, motionLanguageRef: null },
      dimensions: { sourceWidthPx: 2400, sourceHeightPx: 4096, displayWidthPx: 160, displayHeightPx: 280, aspectRatio: "9:16" },
      colorTokensUsed: ["primaryDark"],
      intendedSlot: { slotId: "lobby/otis/regular/idle", appPath: "public/art/lobby/otis/regular/idle.webp", component: "OtisCharacter", requiresGsap: false },
      gsapCues: [],
      accessibility: { altText: "x", role: "img", prefersReducedMotionStrategy: "static-fallback" },
      integrationSnippetTemplate: "character-sprite-img",
      payloadFiles: [{ relPath: "idle.webp", bytes }],
      primaryFileRelPath: "idle.webp",
      generation: { agentName: "character-master", provider: "gemini-2.5-flash-image", modelId: "gemini-2.5-flash-image", seed: 1, costCents: 4, durationMs: 100, generatedAt: "2026-05-25T00:00:00.000Z" },
    });

    expect(existsSync(join(tmpDir, "manifest.json"))).toBe(true);
    expect(existsSync(join(tmpDir, "payload", "idle.webp"))).toBe(true);
    const manifest = JSON.parse(readFileSync(join(tmpDir, "manifest.json"), "utf8"));
    expect(manifest.payload.files[0].sha256).toBe(expectedHash);
    expect(pack.manifest.packId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects when payloadFiles is empty", async () => {
    await expect(
      createFoundryAssetPack({
        packDir: tmpDir,
        kind: "character-sprite",
        agent: "character-master",
        canonRefs: { characterId: "x", paletteRef: null, typographyRef: null, motionLanguageRef: null },
        dimensions: { sourceWidthPx: 1, sourceHeightPx: 1, displayWidthPx: 1, displayHeightPx: 1, aspectRatio: "1:1" },
        colorTokensUsed: [],
        intendedSlot: { slotId: "x", appPath: "public/x.webp", component: null, requiresGsap: false },
        gsapCues: [],
        accessibility: { altText: "x", role: "img", prefersReducedMotionStrategy: "static-fallback" },
        integrationSnippetTemplate: "x",
        payloadFiles: [],
        primaryFileRelPath: "x.webp",
        generation: { agentName: "character-master", provider: "x", modelId: "x", seed: 0, costCents: 0, durationMs: 0, generatedAt: "2026-05-25T00:00:00.000Z" },
      }),
    ).rejects.toThrow();
  });
});
