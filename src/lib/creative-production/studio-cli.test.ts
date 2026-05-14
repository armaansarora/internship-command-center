import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREATIVE_ASSET_TYPES,
  getCreativeAssetTypeDefinition,
  type CreativeAssetType,
} from "./index";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");

describe("art:studio CLI", () => {
  it("prints the guided creative production opening and writes state", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-"));

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("What are we adding to The Tower today?");
    expect(output).toContain("So far we have done");
    expect(output).toContain("I suggest we do Mara Voss");
    expect(output).toContain("Still remaining");
    expect(output).toContain("Known warnings");
    expect(output).toContain("character, environment, prop, ui-texture, animation, scene, icon-system, marketing-hero");

    const state = JSON.parse(readFileSync(join(root, "state.json"), "utf8")) as { schemaVersion: string };
    expect(state.schemaVersion).toBe("tower-creative-studio-state-v1");
    expect(existsSync(join(root, "ledgers", "housekeeping.jsonl"))).toBe(true);
    expect(existsSync(join(root, "ledgers", "improvements.jsonl"))).toBe(true);
  });

  it("rejects state roots outside the repo or art lab unless explicitly under temp for tests", () => {
    expect(() =>
      execFileSync(tsx, [
        "scripts/creative-production-engine.ts",
        "--state-root",
        "../../outside",
      ], { cwd: process.cwd(), encoding: "utf8" }),
    ).toThrow(/state-root must stay inside/);
  });

  it("creates a universal production packet after the guided brief is known", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-packet-"));

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--asset-type",
      "environment",
      "--name",
      "War Room Background",
      "--brief",
      "A kinetic but premium applications command room background.",
      "--run-id",
      "war-room-bg-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Created Creative Production Engine packet");
    expect(output).toContain("War Room Background");

    const packetPath = join(root, "environments", "war-room-bg-v1", "creative-brief.json");
    const promptPath = join(root, "environments", "war-room-bg-v1", "prompt.md");
    const actionPath = join(root, "environments", "war-room-bg-v1", "next-action.md");
    const packet = JSON.parse(readFileSync(packetPath, "utf8")) as {
      assetType: string;
      name: string;
      gates: string[];
      promotionPhrase: string;
    };

    expect(packet.assetType).toBe("environment");
    expect(packet.name).toBe("War Room Background");
    expect(packet.gates).toEqual(["Housekeeping Gate", "Continuous Improvement Gate"]);
    expect(packet.promotionPhrase).toBe("approved for app");
    expect(readFileSync(promptPath, "utf8")).toContain("A kinetic but premium applications command room background.");
    expect(readFileSync(actionPath, "utf8")).toContain("Next Legal Action");
  });

  it("creates packets for every registered asset type without character-only assumptions", () => {
    for (const assetType of CREATIVE_ASSET_TYPES) {
      const root = mkdtempSync(join(tmpdir(), `tower-${assetType}-packet-`));
      const runId = `${assetType}-packet-v1`;

      execFileSync(tsx, [
        "scripts/creative-production-engine.ts",
        "--state-root",
        root,
        "--asset-type",
        assetType,
        "--name",
        `${assetType} packet`,
        "--brief",
        `Create a production packet for ${assetType}.`,
        "--run-id",
        runId,
      ], { cwd: process.cwd(), encoding: "utf8" });

      const folder = getCreativeAssetTypeDefinition(assetType as CreativeAssetType).outputRoot.split("/").at(-1) ?? assetType;
      const packetPath = join(root, folder, runId, "creative-brief.json");
      const packet = JSON.parse(readFileSync(packetPath, "utf8")) as {
        assetType: string;
        outputRoot: string;
      };

      expect(packet.assetType).toBe(assetType);
      expect(packet.outputRoot).toContain(join(root, folder, runId));
      expect(JSON.stringify(packet)).not.toContain("outfitVariant");
      expect(existsSync(join(root, folder, runId, "ledgers", "housekeeping.jsonl"))).toBe(true);
      expect(existsSync(join(root, folder, runId, "ledgers", "improvements.jsonl"))).toBe(true);
    }
  }, 20000);

  it("rejects unknown flags and unsafe run ids", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-invalid-"));

    expect(() =>
      execFileSync(tsx, [
        "scripts/creative-production-engine.ts",
        "--state-root",
        root,
        "--asset-typo",
        "environment",
      ], { cwd: process.cwd(), encoding: "utf8" }),
    ).toThrow(/Unknown flag/);

    expect(() =>
      execFileSync(tsx, [
        "scripts/creative-production-engine.ts",
        "--state-root",
        root,
        "--asset-type",
        "environment",
        "--name",
        "Escape",
        "--brief",
        "Try to escape the packet root.",
        "--run-id",
        "../escape",
      ], { cwd: process.cwd(), encoding: "utf8" }),
    ).toThrow(/--run-id/);
  });

  it("backs up corrupt state instead of silently overwriting it", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-corrupt-"));
    const statePath = join(root, "state.json");

    writeFileSync(statePath, "{ not json");

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Recovered corrupt state backup");
    expect(readdirSync(root).some((name) => name.startsWith("state.json.corrupt-"))).toBe(true);
    expect(JSON.parse(readFileSync(statePath, "utf8"))).toMatchObject({
      schemaVersion: "tower-creative-studio-state-v1",
    });
  });
});
