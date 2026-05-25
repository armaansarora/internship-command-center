import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTowerContext, pickCharacterContext, pickFloorContext, resetTowerContextCache } from "./tower-context";

describe("tower-context bundle", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-tc-"));
    resetTowerContextCache();
  });

  it("loads style envelope from docs/ART-BIBLE.md", async () => {
    const bundle = await loadTowerContext({ workspaceRoot, reload: true });
    expect(bundle.styleEnvelope.id).toBe("tower-flat-plus-depth-v1");
    expect(bundle.styleEnvelope.storyTone).toBe("Professional Scars");
    expect(bundle.styleEnvelope.visualNorthStar).toMatch(/Tower should feel like a living internship headquarters/i);
    expect(bundle.styleEnvelope.styleRules).toMatch(/Locked character style/i);
  });

  it("parses per-character image prompts from CHARACTER-IMAGE-PROMPTS.md", async () => {
    const bundle = await loadTowerContext({ workspaceRoot, reload: true });
    const sol = pickCharacterContext(bundle, "cno");
    expect(sol).not.toBeNull();
    expect(sol!.displayName).toBe("Sol Navarro");
    expect(sol!.firstName).toBe("Sol");
    expect(sol!.title).toBe("Chief Networking Officer");
    expect(sol!.conceptBoardPrompt).toMatch(/Sol Navarro/);
    expect(sol!.conceptBoardPrompt).toMatch(/tower-flat-plus-depth-v1/);
    expect(sol!.posePackPromptTemplate).toMatch(/outfitVariantName/);
    expect(sol!.negativePrompt).toMatch(/spammy sales posture/);
  });

  it("parses per-character bible canon from CHARACTER-BIBLE.md", async () => {
    const bundle = await loadTowerContext({ workspaceRoot, reload: true });
    const mara = pickCharacterContext(bundle, "ceo");
    expect(mara).not.toBeNull();
    expect(mara!.wound).toMatch(/blamed for a senior leader/i);
    expect(mara!.visualDNA).toMatch(/Commanding stillness/i);
    expect(mara!.forbiddenVisualTraits).toMatch(/no celebrity likeness/i);
  });

  it("builds a floor index with route + liveUrl per space", async () => {
    const bundle = await loadTowerContext({ workspaceRoot, reload: true });
    const rolodex = pickFloorContext(bundle, "rolodex-lounge");
    expect(rolodex).not.toBeNull();
    expect(rolodex!.floorNumber).toBe("6F");
    expect(rolodex!.roomName).toBe("The Rolodex Lounge");
    expect(rolodex!.liveUrl).toBe("https://www.interntower.com/rolodex-lounge");
    expect(rolodex!.characterIds).toContain("cno");
  });

  it("caches the bundle across calls; reload bypasses", async () => {
    const a = await loadTowerContext({ workspaceRoot });
    const b = await loadTowerContext({ workspaceRoot });
    expect(b).toBe(a); // same reference
    const c = await loadTowerContext({ workspaceRoot, reload: true });
    expect(c).not.toBe(a);
  });

  it("exposes protectedAssets with lobby backgrounds + Otis/Mara byte-protection", async () => {
    const bundle = await loadTowerContext({ workspaceRoot, reload: true });
    expect(bundle.protectedAssets.lobbyBackgrounds).toContain("public/lobby/bg-1.jpg");
    expect(bundle.protectedAssets.byteProtectedCharacters).toEqual(["otis", "ceo"]);
  });
});
