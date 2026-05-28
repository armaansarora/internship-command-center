import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendRejection, readRejections } from "./rejection-ledger";

describe("rejection ledger", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-rej-")); });

  it("appends and reads rejections", () => {
    appendRejection(dir, {
      at: new Date().toISOString(),
      characterId: "otis",
      lane: 5,
      reason: "jawline too perfect",
      codes: ["style-coherence-failed"],
      promptHash: "sha256:zzz",
    });
    const list = readRejections(dir);
    expect(list).toHaveLength(1);
    expect(list[0]!.reason).toContain("jawline");
  });

  it("filters by characterId", () => {
    appendRejection(dir, {
      at: "2026-05-01T00:00:00.000Z",
      characterId: "otis",
      reason: "drift",
      codes: ["c1"],
    });
    appendRejection(dir, {
      at: "2026-05-02T00:00:00.000Z",
      characterId: "ceo",
      reason: "drift",
      codes: ["c2"],
    });
    const otis = readRejections(dir, { characterId: "otis" });
    expect(otis).toHaveLength(1);
    expect(otis[0]!.characterId).toBe("otis");
  });

  it("preserves optional source/lane/promptHash for memory-scope filtering", () => {
    appendRejection(dir, {
      at: "2026-05-01T00:00:00.000Z",
      characterId: "sol-navarro",
      reason: "wardrobe drift",
      codes: ["WARDROBE"],
      lane: 3,
      promptHash: "h-9",
      source: "character",
    });
    const [entry] = readRejections(dir);
    expect(entry!.lane).toBe(3);
    expect(entry!.promptHash).toBe("h-9");
    expect(entry!.source).toBe("character");
  });
});
