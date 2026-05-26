import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runArtLabFloorCli } from "../cli";

vi.mock("@/lib/artlab/sdk/canon", () => ({
  loadArtLabFloorCanon: vi.fn().mockResolvedValue({
    slug: "war-room",
    displayName: "The War Room",
    mood: "tactical-luxury",
    palette: ["#1A1A2E", "#C9A84C", "#3F3F4E"],
    roomElements: ["wall-mounted-boards", "leather-chairs", "globe"],
    aspectRatio: "16:9",
    typography: "playfair-display",
  }),
}));

vi.mock("@/lib/artlab/sdk/asset-pack", () => ({
  buildArtLabAssetPack: vi.fn(async (manifest: Record<string, unknown>) => {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { join: pathJoin } = await import("node:path");
    const dir = (manifest as { __packDir?: string }).__packDir ?? "/tmp";
    mkdirSync(dir, { recursive: true });
    writeFileSync(pathJoin(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
    return { packId: "war-room-golden", manifest };
  }),
}));

describe("golden war-room run", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "artlab-floor-golden-"));
  });

  it("produces 7 PNGs (7 time-states × 1 composite layer) + manifest.json", async () => {
    await runArtLabFloorCli({
      floorSlug: "war-room",
      runDir: dir,
      seed: 1,
      providerKind: "mock",
    });
    const packDir = join(dir, "pack");
    const timeStates = readdirSync(packDir).filter((f) =>
      ["dawn", "morning", "midday", "afternoon", "dusk", "evening", "night"].includes(f),
    );
    expect(timeStates).toHaveLength(7);
    let pngCount = 0;
    for (const ts of timeStates) {
      const files = readdirSync(join(packDir, ts));
      pngCount += files.filter((f) => f.endsWith(".png")).length;
    }
    expect(pngCount).toBe(7);
    expect(existsSync(join(dir, "manifest.json"))).toBe(true);
  });

  it("manifest names every variant with its single composite layer", async () => {
    await runArtLabFloorCli({
      floorSlug: "war-room",
      runDir: dir,
      seed: 1,
      providerKind: "mock",
    });
    const manifest = JSON.parse(
      readFileSync(join(dir, "manifest.json"), "utf8"),
    ) as {
      compositeKind: string;
      variants: Array<{
        timeState: string;
        kind: string;
        layers: Array<{ name: string; path: string }>;
      }>;
    };
    expect(manifest.compositeKind).toBe("single-composite");
    expect(manifest.variants.map((v) => v.timeState).sort()).toEqual([
      "afternoon",
      "dawn",
      "dusk",
      "evening",
      "midday",
      "morning",
      "night",
    ]);
    for (const variant of manifest.variants) {
      expect(variant.kind).toBe("single-composite");
      const names = variant.layers.map((l) => l.name);
      expect(names).toEqual(["composite"]);
    }
  });

  // Critical 2: CLI now ignores `reportedElements` even if passed. We
  // pass it here to prove backwards compat without theatrical gating.
  it("ignores legacy reportedElements input (no theatrical gate)", async () => {
    const out = await runArtLabFloorCli({
      floorSlug: "war-room",
      runDir: dir,
      reportedElements: [], // intentionally empty: would have failed the old gate
      seed: 1,
      providerKind: "mock",
    });
    expect(out.summary).toContain("validated");
  });

  it("dry-run mode prints `validated` without writing artefacts", async () => {
    const out = await runArtLabFloorCli({
      floorSlug: "war-room",
      runDir: dir,
      seed: 1,
      providerKind: "mock",
      dryRun: true,
    });
    expect(out.summary).toContain("validated");
    expect(existsSync(join(dir, "pack"))).toBe(false);
  });
});
