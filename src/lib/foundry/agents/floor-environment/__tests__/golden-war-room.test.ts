import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFoundryFloorCli } from "../cli";

vi.mock("@/lib/foundry/canon", () => ({
  loadFoundryFloorCanon: vi.fn().mockResolvedValue({
    slug: "war-room",
    displayName: "The War Room",
    mood: "tactical-luxury",
    palette: ["#1A1A2E", "#C9A84C", "#3F3F4E"],
    roomElements: ["wall-mounted-boards", "leather-chairs", "globe"],
    aspectRatio: "16:9",
    typography: "playfair-display",
  }),
}));

vi.mock("@/lib/foundry/asset-pack", () => ({
  buildFoundryAssetPack: vi.fn(async (manifest: Record<string, unknown>) => {
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
    dir = mkdtempSync(join(tmpdir(), "foundry-floor-golden-"));
  });

  it("produces 21 PNGs (7 time-states × 3 layers) + manifest.json", async () => {
    await runFoundryFloorCli({
      floorSlug: "war-room",
      runDir: dir,
      reportedElements: ["wall-mounted-boards", "leather-chairs", "globe"],
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
    expect(pngCount).toBe(21);
    expect(existsSync(join(dir, "manifest.json"))).toBe(true);
  });

  it("manifest names every variant and every layer", async () => {
    await runFoundryFloorCli({
      floorSlug: "war-room",
      runDir: dir,
      reportedElements: ["wall-mounted-boards", "leather-chairs", "globe"],
      seed: 1,
      providerKind: "mock",
    });
    const manifest = JSON.parse(
      readFileSync(join(dir, "manifest.json"), "utf8"),
    ) as {
      variants: Array<{
        timeState: string;
        layers: Array<{ name: string; path: string }>;
      }>;
    };
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
      const names = variant.layers.map((l) => l.name);
      expect(names).toContain("background");
      expect(names).toContain("midground");
      expect(names).toContain("ambient");
    }
  });

  it("dry-run mode prints `validated` without writing artefacts", async () => {
    const out = await runFoundryFloorCli({
      floorSlug: "war-room",
      runDir: dir,
      reportedElements: ["wall-mounted-boards", "leather-chairs", "globe"],
      seed: 1,
      providerKind: "mock",
      dryRun: true,
    });
    expect(out.summary).toContain("validated");
    expect(existsSync(join(dir, "pack"))).toBe(false);
  });
});
