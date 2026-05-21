import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendStyleWin, readStyleWins } from "./style-ledger";

describe("style-wins ledger", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-style-")); });

  it("appends a win and reads it back", () => {
    appendStyleWin(dir, {
      characterId: "otis",
      promotedAt: new Date().toISOString(),
      winningTechniques: ["warm desk lamp in lane 3", "isnet-anime cutout"],
      promptHash: "sha256:abc",
      cutoutModelUsed: "isnet-anime",
      totalCostCents: 664,
    });
    const wins = readStyleWins(dir);
    expect(wins.length).toBe(1);
    expect(wins[0]!.characterId).toBe("otis");
  });

  it("filters by characterId", () => {
    appendStyleWin(dir, { characterId: "otis", promotedAt: new Date().toISOString(), winningTechniques: [], promptHash: "1", totalCostCents: 0 });
    appendStyleWin(dir, { characterId: "ceo", promotedAt: new Date().toISOString(), winningTechniques: [], promptHash: "2", totalCostCents: 0 });
    expect(readStyleWins(dir, { characterId: "otis" })).toHaveLength(1);
  });
});
