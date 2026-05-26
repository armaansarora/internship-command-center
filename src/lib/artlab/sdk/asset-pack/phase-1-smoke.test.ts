import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createArtLabAssetPack,
  readArtLabAssetPack,
  validateArtLabManifestAgainstSlots,
  renderArtLabIntegrationSnippet,
} from "./index";

describe("Phase 1 smoke — create → read → validate → snippet", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "artlab-p1-smoke-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("end-to-end happy path for a character-sprite pack", async () => {
    const { manifest } = await createArtLabAssetPack({
      packDir: tmpDir,
      kind: "character-sprite",
      agent: "character-master",
      canonRefs: { characterId: "otis", paletteRef: "tower-default", typographyRef: null, motionLanguageRef: null },
      dimensions: { sourceWidthPx: 2400, sourceHeightPx: 4096, displayWidthPx: 170, displayHeightPx: 290, aspectRatio: "9:16" },
      colorTokensUsed: ["primaryDark", "goldAccent"],
      intendedSlot: { slotId: "lobby/otis/regular/idle", appPath: "public/art/lobby/otis/regular/idle.webp", component: "OtisCharacter", requiresGsap: false },
      gsapCues: [],
      accessibility: { altText: "Otis, idle", role: "img", prefersReducedMotionStrategy: "static-fallback" },
      integrationSnippetTemplate: "character-sprite-img",
      payloadFiles: [{ relPath: "idle.webp", bytes: Buffer.from("payload-bytes") }],
      primaryFileRelPath: "idle.webp",
      generation: { agentName: "character-master", provider: "gemini", modelId: "gemini-2.5-flash-image", seed: 1, costCents: 4, durationMs: 18000, generatedAt: "2026-05-25T00:00:00.000Z" },
    });

    const readResult = await readArtLabAssetPack(tmpDir);
    if (readResult.ok !== true) throw new Error("expected ok=true on read");

    const slotCheck = validateArtLabManifestAgainstSlots(manifest);
    expect(slotCheck.ok).toBe(true);

    const snippet = renderArtLabIntegrationSnippet(manifest);
    expect(snippet).toContain("OtisCharacter");
    expect(snippet).toContain("/art/lobby/otis/regular/idle.webp");
  });
});
