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
      characterId: "otis",
      runId: "r1",
      lane: 5,
      rejectedAt: new Date(2026, 0, 5).toISOString(),
      reason: "jawline too perfect",
      qaFailureCodes: ["style-coherence-failed"],
      promptHashRejected: "p1",
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
});
