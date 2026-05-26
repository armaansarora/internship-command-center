import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFoundryAssetPack } from "./pack";
import { readFoundryAssetPack } from "./read";

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

describe("readFoundryAssetPack", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "foundry-read-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reads a pack created by createFoundryAssetPack", async () => {
    await createFoundryAssetPack(VALID_INPUT(tmpDir));
    const result = await readFoundryAssetPack(tmpDir);
    if (result.ok !== true) throw new Error("expected ok=true");
    expect(result.manifest.kind).toBe("character-sprite");
    expect(result.payloadBytes["idle.webp"].toString()).toBe("payload-bytes");
  });

  it("returns ok=false when manifest.json is missing", async () => {
    const result = await readFoundryAssetPack(tmpDir);
    expect(result.ok).toBe(false);
  });

  it("returns ok=false when payload bytes don't match manifest sha256", async () => {
    await createFoundryAssetPack(VALID_INPUT(tmpDir));
    writeFileSync(join(tmpDir, "payload", "idle.webp"), Buffer.from("TAMPERED"));
    const result = await readFoundryAssetPack(tmpDir);
    if (result.ok === true) throw new Error("expected ok=false");
    expect(result.code).toBe("payload-sha256-mismatch");
  });
});
