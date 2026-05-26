import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadArtLabMemoryScope } from "./memory-scope";

let memoryDir: string;

beforeEach(() => {
  memoryDir = mkdtempSync(join(tmpdir(), "artlab-memscope-"));
  mkdirSync(memoryDir, { recursive: true });
  writeFileSync(
    join(memoryDir, "style-wins.jsonl"),
    [
      JSON.stringify({ characterId: "rafe-calder", promotedAt: "2026-05-25T12:00:00.000Z", winningTechniques: ["shadow-pass"], promptHash: "h1", totalCostCents: 100, source: "character" }),
      JSON.stringify({ characterId: "war-room", promotedAt: "2026-05-26T12:00:00.000Z", winningTechniques: ["amber-grade"], promptHash: "h2", totalCostCents: 200, source: "floor" }),
      JSON.stringify({ characterId: "tower-btn", promotedAt: "2026-05-27T12:00:00.000Z", winningTechniques: ["brass-gradient"], promptHash: "h3", totalCostCents: 50, source: "ui-texture" }),
    ].join("\n") + "\n",
  );
  writeFileSync(
    join(memoryDir, "style-rejections.jsonl"),
    [
      JSON.stringify({ characterId: "rafe-calder", runId: "r1", lane: 1, rejectedAt: "2026-05-24T12:00:00.000Z", reason: "wrong jacket color", qaFailureCodes: ["WARDROBE"], promptHashRejected: "h0", source: "character" }),
      JSON.stringify({ characterId: "war-room", runId: "r2", lane: 1, rejectedAt: "2026-05-24T13:00:00.000Z", reason: "skyline too bright", qaFailureCodes: ["LIGHT"], promptHashRejected: "h0b", source: "floor" }),
    ].join("\n") + "\n",
  );
});

describe("loadArtLabMemoryScope", () => {
  it("filters wins to the requested agent kind only", () => {
    const scope = loadArtLabMemoryScope(memoryDir, "floor-environment", { topN: 3 });
    expect(scope.recentWins.map((w) => w.techniques)).toEqual(["amber-grade"]);
  });

  it("filters rejections to the requested agent kind only", () => {
    const scope = loadArtLabMemoryScope(memoryDir, "character-master", { topN: 3 });
    expect(scope.recentRejections.map((r) => r.codes)).toEqual(["WARDROBE"]);
  });

  it("returns empty arrays when no entries match the requested kind", () => {
    const scope = loadArtLabMemoryScope(memoryDir, "sprite-animator", { topN: 3 });
    expect(scope.recentWins).toEqual([]);
    expect(scope.recentRejections).toEqual([]);
  });

  it("honors topN cap", () => {
    const scope = loadArtLabMemoryScope(memoryDir, "character-master", { topN: 0 });
    expect(scope.recentWins).toEqual([]);
  });

  it("agent-kind filtering does NOT cross-contaminate (floor sees no character feedback)", () => {
    const floor = loadArtLabMemoryScope(memoryDir, "floor-environment", { topN: 5 });
    for (const w of floor.recentWins) {
      expect(w.techniques).not.toContain("shadow-pass");
    }
  });
});
