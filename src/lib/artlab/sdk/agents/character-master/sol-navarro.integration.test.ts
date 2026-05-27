import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCharacterMaster } from "./index";
import { createMockArtLabImageProvider } from "@/lib/artlab/sdk/providers/mock-provider";
import { readArtLabAssetPack, registerArtLabSlot } from "@/lib/artlab/sdk/asset-pack";

function setupWorkspaceAndCanon(): { workspaceRoot: string; canonRoot: string; cleanup: () => void } {
  const tmpDir = mkdtempSync(join(tmpdir(), "artlab-sol-int-"));
  const canonRoot = join(tmpDir, "canon");
  const workspaceRoot = join(tmpDir, "ws");
  mkdirSync(join(canonRoot, "characters"), { recursive: true });
  mkdirSync(join(canonRoot, "palettes"), { recursive: true });
  mkdirSync(workspaceRoot, { recursive: true });
  writeFileSync(join(canonRoot, "characters", "sol-navarro.yaml"), `
header:
  kind: character
  schemaVersion: "1.0.0"
  id: sol-navarro
  revisedAt: "2026-05-25T00:00:00.000Z"
displayName: "Sol Navarro"
shortLabel: Sol
title: "CNO"
floorId: rolodex-lounge
floorLabel: "Floor 6"
styleEnvelope: tower-flat-plus-depth-v1
visualArchetype: x
silhouette: x
wardrobe: x
props: [x]
mobileRead: x
negativeDNA: x
accent: x
doctrine: x
flaw: x
secretStrength: x
wound: x
outfitVariants: [regular, summer-light, winter-layered]
poseStates: [idle, greeting, listening, thinking, talking, alert, working]
promotionStatus: queued
paletteRef: tower-default
motionProfile: x
artDirectionNotes: x
`, "utf8");
  writeFileSync(join(canonRoot, "palettes", "tower-default.yaml"), `
header:
  kind: palette
  schemaVersion: "1.0.0"
  id: tower-default
  revisedAt: "2026-05-25T00:00:00.000Z"
scope: global
tokens:
  primaryDark: "#1A1A2E"
`, "utf8");

  for (const outfit of ["regular", "summer-light", "winter-layered"]) {
    for (const pose of ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"]) {
      try {
        registerArtLabSlot({
          slotId: `rolodex-lounge/sol-navarro/${outfit}/${pose}`,
          appPath: `public/art/rolodex-lounge/sol-navarro/${outfit}/${pose}.webp`,
          kind: "character-sprite",
          component: "SolCharacter",
          requiresGsap: false,
        });
      } catch { /* already registered */ }
    }
  }

  return { canonRoot, workspaceRoot, cleanup: () => rmSync(tmpDir, { recursive: true, force: true }) };
}

describe("Sol Navarro full integration", () => {
  let cleanup: () => void;

  beforeEach(() => {});

  afterEach(() => {
    cleanup?.();
  });

  it("produces a valid, schema-validated Asset Pack with 21 payload files", async () => {
    const env = setupWorkspaceAndCanon();
    cleanup = env.cleanup;
    const result = await runCharacterMaster({
      input: { characterId: "sol-navarro", canonRoot: env.canonRoot, workspaceRoot: env.workspaceRoot, providerId: "mock-artlab-image", resumeFromStage: null, seed: 100 },
      provider: createMockArtLabImageProvider(),
      emit: () => {},
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.manifest.payload.files.length).toBe(21);
    const reread = await readArtLabAssetPack(result.pack.packDir);
    expect(reread.ok).toBe(true);
  });

  it("resume-from variant-fan-out skips stages 1 + 2 and still produces a valid pack", async () => {
    const env = setupWorkspaceAndCanon();
    cleanup = env.cleanup;
    await runCharacterMaster({
      input: { characterId: "sol-navarro", canonRoot: env.canonRoot, workspaceRoot: env.workspaceRoot, providerId: "mock-artlab-image", resumeFromStage: null, seed: 100 },
      provider: createMockArtLabImageProvider(),
      emit: () => {},
    });
    const stages: string[] = [];
    const result = await runCharacterMaster({
      input: { characterId: "sol-navarro", canonRoot: env.canonRoot, workspaceRoot: env.workspaceRoot, providerId: "mock-artlab-image", resumeFromStage: "variant-fan-out", seed: 100 },
      provider: createMockArtLabImageProvider(),
      emit: (e) => { if (e.kind === "stage-started") stages.push(e.stage); },
    });
    expect(result.ok).toBe(true);
    expect(stages).not.toContain("concept-board");
    expect(stages).not.toContain("anchor-lock");
  });

  it("a deliberately failing provider surfaces an actionable qa-failure reason", async () => {
    const env = setupWorkspaceAndCanon();
    cleanup = env.cleanup;
    // Trigger failure on a prompt fragment that the agent emits in every lane
    // so the provider fails the run deterministically and the orchestrator
    // surfaces an actionable failure reason.
    const provider = createMockArtLabImageProvider({ failOnPromptContains: "Tower flat-plus-depth-v1" });
    const events: string[] = [];
    const result = await runCharacterMaster({
      input: { characterId: "sol-navarro", canonRoot: env.canonRoot, workspaceRoot: env.workspaceRoot, providerId: "mock-artlab-image", resumeFromStage: null, seed: 100 },
      provider,
      emit: (e) => events.push(e.kind),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.reason.length).toBeGreaterThan(0);
    }
  });

  it("writes the manifest.json on disk and it deep-equals the in-memory manifest", async () => {
    const env = setupWorkspaceAndCanon();
    cleanup = env.cleanup;
    const result = await runCharacterMaster({
      input: { characterId: "sol-navarro", canonRoot: env.canonRoot, workspaceRoot: env.workspaceRoot, providerId: "mock-artlab-image", resumeFromStage: null, seed: 100 },
      provider: createMockArtLabImageProvider(),
      emit: () => {},
    });
    if (!result.ok) throw new Error("expected ok");
    expect(existsSync(join(result.pack.packDir, "manifest.json"))).toBe(true);
    const reread = await readArtLabAssetPack(result.pack.packDir);
    if (!reread.ok) throw new Error("re-read failed");
    expect(reread.manifest).toEqual(result.pack.manifest);
  });
});
