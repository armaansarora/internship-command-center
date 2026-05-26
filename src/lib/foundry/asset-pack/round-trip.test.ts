import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFoundryAssetPack } from "./pack";
import { readFoundryAssetPack } from "./read";
import { sha256OfBytes } from "./hashing";

describe("asset pack round-trip byte stability", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "foundry-rt-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("round-trips a 21-file character spritesheet pack with byte-stable manifest + payloads", async () => {
    const outfits = ["regular", "summer-light", "winter-layered"] as const;
    const poses = ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"] as const;
    const payloadFiles = [];
    for (const o of outfits) {
      for (const p of poses) {
        payloadFiles.push({ relPath: `${o}/${p}.webp`, bytes: Buffer.from(`${o}-${p}-bytes`) });
      }
    }
    expect(payloadFiles.length).toBe(21);

    const { manifest } = await createFoundryAssetPack({
      packDir: tmpDir,
      kind: "character-spritesheet",
      agent: "character-master",
      canonRefs: { characterId: "sol-navarro", paletteRef: "tower-default", typographyRef: null, motionLanguageRef: null },
      dimensions: { sourceWidthPx: 2400, sourceHeightPx: 4096, displayWidthPx: 160, displayHeightPx: 280, aspectRatio: "9:16" },
      colorTokensUsed: ["primaryDark"],
      intendedSlot: { slotId: "lobby/otis/regular/idle", appPath: "public/art/lobby/otis/regular/idle.webp", component: "OtisCharacter", requiresGsap: false },
      gsapCues: [],
      accessibility: { altText: "x", role: "img", prefersReducedMotionStrategy: "static-fallback" },
      integrationSnippetTemplate: "character-sprite-img",
      payloadFiles,
      primaryFileRelPath: "regular/idle.webp",
      anchorImageRelPath: "regular/idle.webp",
      anchorPerceptualHash: "0123456789abcdef",
      generation: { agentName: "character-master", provider: "x", modelId: "x", seed: 0, costCents: 0, durationMs: 0, generatedAt: "2026-05-25T00:00:00.000Z" },
    });

    const result = await readFoundryAssetPack(tmpDir);
    if (result.ok !== true) throw new Error("expected ok=true");

    const onDisk = readFileSync(join(tmpDir, "manifest.json"), "utf8");
    expect(JSON.parse(onDisk)).toEqual(manifest);

    for (const f of payloadFiles) {
      expect(result.payloadBytes[f.relPath]).toEqual(f.bytes);
      expect(sha256OfBytes(result.payloadBytes[f.relPath]!)).toBe(sha256OfBytes(f.bytes));
    }
  });

  it("re-reading a pack produces a manifest that deep-equals the in-memory manifest", async () => {
    const { manifest } = await createFoundryAssetPack({
      packDir: tmpDir,
      kind: "character-sprite",
      agent: "character-master",
      canonRefs: { characterId: "sol-navarro", paletteRef: "tower-default", typographyRef: null, motionLanguageRef: null },
      dimensions: { sourceWidthPx: 1, sourceHeightPx: 1, displayWidthPx: 1, displayHeightPx: 1, aspectRatio: "1:1" },
      colorTokensUsed: [],
      intendedSlot: { slotId: "lobby/otis/regular/idle", appPath: "public/art/lobby/otis/regular/idle.webp", component: "OtisCharacter", requiresGsap: false },
      gsapCues: [],
      accessibility: { altText: "x", role: "img", prefersReducedMotionStrategy: "static-fallback" },
      integrationSnippetTemplate: "character-sprite-img",
      payloadFiles: [{ relPath: "x.webp", bytes: Buffer.from("x") }],
      primaryFileRelPath: "x.webp",
      generation: { agentName: "character-master", provider: "x", modelId: "x", seed: 0, costCents: 0, durationMs: 0, generatedAt: "2026-05-25T00:00:00.000Z" },
    });
    const result = await readFoundryAssetPack(tmpDir);
    if (result.ok !== true) throw new Error("expected ok=true");
    expect(result.manifest).toEqual(manifest);
  });
});
