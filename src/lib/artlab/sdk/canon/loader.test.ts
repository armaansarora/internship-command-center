// src/lib/artlab/sdk/canon/loader.test.ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadArtLabCanonFile } from "./loader";

const VALID_YAML = `
header:
  kind: character
  schemaVersion: "1.0.0"
  id: sol-navarro
  revisedAt: "2026-05-25T00:00:00.000Z"
displayName: Sol Navarro
shortLabel: Sol
title: Chief Networking Officer
floorId: rolodex-lounge
floorLabel: "Floor 6 — The Rolodex Lounge"
styleEnvelope: tower-flat-plus-depth-v1
visualArchetype: warm-precise-relationship-curator
silhouette: "compact-shoulder-line, controlled-hair-volume, contact-card-prop"
wardrobe: "neutral-blazer, soft-collared-blouse, subtle-jewelry"
props:
  - contact-card
  - felt-tip-pen
mobileRead: "warm-eyes-first, hand-prop-second, posture-third"
negativeDNA: "no-sales-energy, no-toothy-grin, no-loud-color"
accent: "burnt-orange-pocket-square"
doctrine: "every-relationship-deserves-attention"
flaw: "over-commits-emotionally"
secretStrength: "remembers-everything"
wound: "betrayed-by-a-mentor"
outfitVariants:
  - regular
  - summer-light
  - winter-layered
poseStates:
  - idle
  - greeting
  - listening
  - thinking
  - talking
  - alert
  - working
promotionStatus: queued
paletteRef: tower-default
motionProfile: networking-warm
artDirectionNotes: "Sol should feel socially open and precise."
`;

describe("loadArtLabCanonFile", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "artlab-canon-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads a valid character YAML file", async () => {
    const path = join(tmpDir, "sol-navarro.yaml");
    writeFileSync(path, VALID_YAML, "utf8");
    const result = await loadArtLabCanonFile(path);
    expect(result.header.id).toBe("sol-navarro");
    expect(result.header.kind).toBe("character");
    expect(result.sourcePath).toBe(path);
    expect(result.loadDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("throws a typed error when the YAML is malformed", async () => {
    const path = join(tmpDir, "broken.yaml");
    writeFileSync(path, "not: [valid\n  yaml", "utf8");
    await expect(loadArtLabCanonFile(path)).rejects.toThrow(/yaml parse/i);
  });

  it("throws a typed error when the header is missing", async () => {
    const path = join(tmpDir, "no-header.yaml");
    writeFileSync(path, "displayName: x\n", "utf8");
    await expect(loadArtLabCanonFile(path)).rejects.toThrow(/header/i);
  });

  it("throws a typed error when the file is missing", async () => {
    await expect(loadArtLabCanonFile(join(tmpDir, "missing.yaml"))).rejects.toThrow(/not found|ENOENT/i);
  });
});
