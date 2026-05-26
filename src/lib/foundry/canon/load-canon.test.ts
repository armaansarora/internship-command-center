// src/lib/foundry/canon/load-canon.test.ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadFoundryCanon } from "./load-canon";

function setupCanonDir(root: string): void {
  for (const sub of ["characters", "palettes", "typography", "motion-language", "space-tokens", "iconography-rules"]) {
    mkdirSync(join(root, sub), { recursive: true });
  }
  writeFileSync(
    join(root, "characters", "sol.yaml"),
    `
header:
  kind: character
  schemaVersion: "1.0.0"
  id: sol-navarro
  revisedAt: "2026-05-25T00:00:00.000Z"
displayName: Sol Navarro
shortLabel: Sol
title: Chief Networking Officer
floorId: rolodex-lounge
floorLabel: "Floor 6"
styleEnvelope: tower-flat-plus-depth-v1
visualArchetype: warm
silhouette: compact
wardrobe: blazer
props: [contact-card]
mobileRead: warm-eyes-first
negativeDNA: no-sales-energy
accent: orange
doctrine: every-relationship
flaw: over-commits
secretStrength: remembers
wound: betrayed
outfitVariants: [regular, summer-light, winter-layered]
poseStates: [idle, greeting, listening, thinking, talking, alert, working]
promotionStatus: queued
paletteRef: tower-default
motionProfile: networking-warm
artDirectionNotes: x
`,
    "utf8",
  );
  writeFileSync(
    join(root, "palettes", "tower-default.yaml"),
    `
header:
  kind: palette
  schemaVersion: "1.0.0"
  id: tower-default
  revisedAt: "2026-05-25T00:00:00.000Z"
scope: global
tokens:
  primaryDark: "#1A1A2E"
`,
    "utf8",
  );
}

describe("loadFoundryCanon", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "foundry-canon-tree-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads every YAML file under the canon root", async () => {
    setupCanonDir(tmpDir);
    const canon = await loadFoundryCanon({ canonRoot: tmpDir });
    expect(canon.characters.length).toBe(1);
    expect(canon.characters[0]!.header.id).toBe("sol-navarro");
    expect(canon.palettes.length).toBe(1);
    expect(canon.palettes[0]!.header.id).toBe("tower-default");
  });

  it("completes in under 50 ms for a small canon", async () => {
    setupCanonDir(tmpDir);
    const start = performance.now();
    await loadFoundryCanon({ canonRoot: tmpDir });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it("rejects when two records share the same id within a kind", async () => {
    setupCanonDir(tmpDir);
    writeFileSync(
      join(tmpDir, "palettes", "duplicate.yaml"),
      `
header:
  kind: palette
  schemaVersion: "1.0.0"
  id: tower-default
  revisedAt: "2026-05-25T00:00:00.000Z"
scope: global
tokens:
  primaryDark: "#000000"
`,
      "utf8",
    );
    await expect(loadFoundryCanon({ canonRoot: tmpDir })).rejects.toThrow(/duplicate.*tower-default/i);
  });
});
