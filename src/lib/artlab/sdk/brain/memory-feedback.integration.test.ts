import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadArtLabMemoryScope } from "./memory-scope";
import { createCharacterMasterBrain } from "./agents/character-master-brain";
import { createFloorEnvironmentBrain } from "./agents/floor-environment-brain";

let memoryDir: string;

beforeEach(() => {
  memoryDir = mkdtempSync(join(tmpdir(), "artlab-mem-int-"));
  writeFileSync(
    join(memoryDir, "style-wins.jsonl"),
    [
      JSON.stringify({ characterId: "rafe-calder", promotedAt: "2026-05-25T12:00:00.000Z", winningTechniques: ["char-trick"], promptHash: "h1", totalCostCents: 100, source: "character" }),
      JSON.stringify({ characterId: "war-room", promotedAt: "2026-05-26T12:00:00.000Z", winningTechniques: ["floor-trick"], promptHash: "h2", totalCostCents: 200, source: "floor" }),
    ].join("\n") + "\n",
  );
  writeFileSync(
    join(memoryDir, "style-rejections.jsonl"),
    [
      JSON.stringify({ characterId: "rafe-calder", runId: "r1", lane: 1, rejectedAt: "2026-05-24T12:00:00.000Z", reason: "wrong jacket", qaFailureCodes: ["WARDROBE"], promptHashRejected: "h0", source: "character" }),
      JSON.stringify({ characterId: "war-room", runId: "r2", lane: 1, rejectedAt: "2026-05-24T13:00:00.000Z", reason: "wrong light", qaFailureCodes: ["LIGHT"], promptHashRejected: "h0b", source: "floor" }),
    ].join("\n") + "\n",
  );
});

describe("memory feedback scoping — end to end", () => {
  it("character brain receives only character feedback", async () => {
    const scope = loadArtLabMemoryScope(memoryDir, "character-master", { topN: 3 });
    const brain = createCharacterMasterBrain({ apiKey: "", model: "test", dryRun: true });
    const result = await brain.decide({
      characterId: "rafe-calder",
      directive: "smoke",
      recentWins: scope.recentWins,
      recentRejections: scope.recentRejections,
    });
    expect(result.output).toBeDefined();
    expect(scope.recentWins[0]?.techniques).toBe("char-trick");
    expect(scope.recentRejections[0]?.codes).toBe("WARDROBE");
  });

  it("floor brain receives only floor feedback", async () => {
    const scope = loadArtLabMemoryScope(memoryDir, "floor-environment", { topN: 3 });
    const brain = createFloorEnvironmentBrain({ apiKey: "", model: "test", dryRun: true });
    const result = await brain.decide({
      space: "war-room",
      directive: "smoke",
      timeStates: ["dusk"],
      recentWins: scope.recentWins,
      recentRejections: scope.recentRejections,
    });
    expect(result.output).toBeDefined();
    expect(scope.recentWins[0]?.techniques).toBe("floor-trick");
    expect(scope.recentRejections[0]?.codes).toBe("LIGHT");
  });

  it("the two scopes never share a single technique", () => {
    const charScope = loadArtLabMemoryScope(memoryDir, "character-master", { topN: 5 });
    const floorScope = loadArtLabMemoryScope(memoryDir, "floor-environment", { topN: 5 });
    const charTechs = new Set(charScope.recentWins.map((w) => w.techniques));
    const floorTechs = new Set(floorScope.recentWins.map((w) => w.techniques));
    for (const t of charTechs) expect(floorTechs.has(t)).toBe(false);
  });
});
