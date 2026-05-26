import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCharacterSubcommand } from "./character";

const CHARACTER_YAML = `
header:
  kind: character
  schemaVersion: "1.0.0"
  id: sol-navarro
  revisedAt: "2026-05-25T00:00:00.000Z"
displayName: "Sol Navarro"
shortLabel: Sol
title: "Chief Networking Officer"
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
`;

const PALETTE_YAML = `
header:
  kind: palette
  schemaVersion: "1.0.0"
  id: tower-default
  revisedAt: "2026-05-25T00:00:00.000Z"
scope: global
tokens:
  primaryDark: "#1A1A2E"
`;

describe("foundry character CLI", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "foundry-cli-char-"));
    const canon = join(tmpDir, "canon");
    mkdirSync(join(canon, "characters"), { recursive: true });
    mkdirSync(join(canon, "palettes"), { recursive: true });
    writeFileSync(join(canon, "characters", "sol-navarro.yaml"), CHARACTER_YAML, "utf8");
    writeFileSync(join(canon, "palettes", "tower-default.yaml"), PALETTE_YAML, "utf8");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("runs the agent and writes a pack directory under workspace/runs/<id>/pack", async () => {
    const out: string[] = [];
    const err: string[] = [];
    const exit = await runCharacterSubcommand({
      argv: ["Sol Navarro"],
      canonRoot: join(tmpDir, "canon"),
      workspaceRoot: join(tmpDir, "ws"),
      providerMode: "mock",
      stdout: (s) => out.push(s),
      stderr: (s) => err.push(s),
    });
    expect(exit).toBe(0);
    const packDir = join(tmpDir, "ws", "runs", "sol-navarro", "pack");
    expect(existsSync(join(packDir, "manifest.json"))).toBe(true);
  });

  it("returns exit code 2 with help when no character name is given", async () => {
    const out: string[] = [];
    const err: string[] = [];
    const exit = await runCharacterSubcommand({
      argv: [],
      canonRoot: join(tmpDir, "canon"),
      workspaceRoot: join(tmpDir, "ws"),
      providerMode: "mock",
      stdout: (s) => out.push(s),
      stderr: (s) => err.push(s),
    });
    expect(exit).toBe(2);
    expect(err.join("\n")).toMatch(/usage/i);
  });
});
