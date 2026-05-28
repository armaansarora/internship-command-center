import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getRelevantMemory } from "./retrieve";
import { appendStyleWin } from "./style-ledger";
import { appendRejection } from "./rejection-ledger";
import { appendPromptEvolution } from "./prompt-evolution";

describe("getRelevantMemory", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "artlab-mem-"));
    for (let i = 0; i < 4; i += 1) {
      appendStyleWin(dir, {
        characterId: i % 2 === 0 ? "otis" : "ceo",
        promotedAt: new Date(2026, 0, i + 1).toISOString(),
        winningTechniques: [`technique-${i}`],
        promptHash: `h${i}`,
        totalCostCents: 100 * i,
      });
    }
    appendRejection(dir, {
      at: new Date(2026, 0, 5).toISOString(),
      characterId: "otis",
      lane: 5,
      reason: "jawline too perfect",
      codes: ["style-coherence-failed"],
      promptHash: "p1",
    });
    appendPromptEvolution(dir, {
      promptComponent: "character-concept-base",
      version: "v1.4",
      changedAt: new Date(2026, 0, 6).toISOString(),
      diff: "+ preserve asymmetry",
      triggeredBy: "rejection-pattern-jawline-too-perfect",
      outcomes: { subsequentRejections: 0, subsequentPromotions: 0 },
    });
  });

  it("returns top-N wins per characterId by recency", async () => {
    const mem = await getRelevantMemory({ memoryDir: dir, assetType: "character", characterId: "otis", topN: 1 });
    expect(mem.wins).toHaveLength(1);
    expect(mem.wins[0]!.characterId).toBe("otis");
  });

  it("returns rejections and recent prompt hardening", async () => {
    const mem = await getRelevantMemory({ memoryDir: dir, assetType: "character", topN: 5 });
    expect(mem.rejections.length).toBeGreaterThanOrEqual(1);
    expect(mem.recentPromptHardening.length).toBeGreaterThanOrEqual(1);
  });

  // Unit 4 (2026-05-27) — a freshly-appended rejection must surface in
  // `getRelevantMemory({characterId})`. Before Unit 4, no production
  // callers wrote rejections, so this round-trip was untested. The brain
  // agents read from `getRelevantMemory` for `recentRejections`, so a
  // schema/path drift here translates directly to the brain seeing no
  // taste signal even when the writers are wired.
  it("round-trips a just-written rejection through getRelevantMemory(characterId)", async () => {
    const characterId = "sol-navarro";
    const at = new Date(2026, 4, 27).toISOString();
    appendRejection(dir, {
      at,
      characterId,
      reason: "repair-required",
      codes: ["alpha-missing"],
      lane: 2,
      source: "character",
    });
    const mem = await getRelevantMemory({ memoryDir: dir, assetType: "character", characterId, topN: 5 });
    expect(mem.rejections.length).toBeGreaterThanOrEqual(1);
    const just = mem.rejections.find((r) => r.characterId === characterId && r.at === at);
    expect(just).toBeDefined();
    expect(just!.reason).toBe("repair-required");
    expect(just!.codes).toContain("alpha-missing");
  });
});
