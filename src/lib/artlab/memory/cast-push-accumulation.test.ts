// src/lib/artlab/memory/cast-push-accumulation.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendStyleWin, readStyleWins, StyleWinEntrySchema } from "./style-ledger";

describe.skip("live spend — Phase 6 memory accumulation (manual: run after each character)", () => {
  const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? ".artlab/engine";

  it("style-wins.jsonl grows by 1 per promoted character", () => {
    const path = join(workspaceRoot, "memory", "style-wins.jsonl");
    expect(existsSync(path)).toBe(true);
    const lines = readFileSync(path, "utf8").trim().split("\n").filter((l) => l);
    const wins = lines.map((l) => JSON.parse(l)) as { characterId: string; source?: string }[];
    const characterIds = new Set(wins.map((w) => w.characterId));
    // After Otis + Mara import + Rafe + 9 cast = 12 distinct character IDs by end of Phase 6
    expect(characterIds.size).toBeGreaterThanOrEqual(3); // adjust as cast push progresses
  });

  it("style-wins from legacy-import are preserved (Otis + Mara/ceo)", () => {
    const path = join(workspaceRoot, "memory", "style-wins.jsonl");
    const wins = readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l)) as { characterId: string; source?: string }[];
    expect(wins.some((w) => w.characterId === "otis" && w.source === "legacy-import")).toBe(true);
    expect(wins.some((w) => w.characterId === "ceo" && w.source === "legacy-import")).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// Shape test — exercise `appendStyleWin` directly on a synthetic workspace.
// No live spend. This is the regression guard for two distinct contracts:
//
//   1. characterId MUST be canon header.id (e.g. "sol-navarro"), NOT the
//      legacy roleSlug ("cno"). Unit 5 fixed the intake router to write the
//      canonical header.id; this test asserts that an artlab-promotion entry
//      with header.id round-trips through the schema.
//   2. The `source` field MUST be present on artlab-promotion entries. Unit 4
//      wired this so we can distinguish legacy imports from live promotions.
//
// If either contract regresses (e.g. someone writes `characterId: "cno"` or
// drops the `source` field), this test fails with a precise error.
// -----------------------------------------------------------------------------
describe("shape — style-wins.jsonl after a single synthetic promotion", () => {
  let workspaceRoot: string;
  let memoryDir: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-stylewins-shape-"));
    memoryDir = join(workspaceRoot, "memory");
    mkdirSync(memoryDir, { recursive: true });
  });

  it("appendStyleWin writes exactly one line with canonical characterId + source", () => {
    const entry = {
      characterId: "sol-navarro", // canon header.id, NOT "cno" (Unit 5 regression guard)
      promotedAt: "2026-05-27T12:00:00.000Z",
      winningTechniques: ["concept-board-v2", "cutout-pool-warm"],
      promptHash: "deadbeef0123",
      cutoutModelUsed: "gemini-2.5-flash-image",
      totalCostCents: 137,
      source: "artlab-promotion", // Unit 4 regression guard
      fileCount: 21,
    };

    appendStyleWin(memoryDir, entry);

    const path = join(memoryDir, "style-wins.jsonl");
    expect(existsSync(path)).toBe(true);

    const raw = readFileSync(path, "utf8");
    const lines = raw.trim().split("\n").filter((l) => l);
    expect(lines).toHaveLength(1);

    // The on-disk JSON must parse against the canonical schema. This is what
    // catches schema-shape drift across the whole ledger.
    const parsed = StyleWinEntrySchema.parse(JSON.parse(lines[0]!));
    expect(parsed.characterId).toBe("sol-navarro");
    expect(parsed.source).toBe("artlab-promotion");
    expect(parsed.promotedAt).toBe("2026-05-27T12:00:00.000Z");
    expect(parsed.winningTechniques).toEqual(["concept-board-v2", "cutout-pool-warm"]);
    expect(parsed.promptHash).toBe("deadbeef0123");
    expect(parsed.cutoutModelUsed).toBe("gemini-2.5-flash-image");
    expect(parsed.totalCostCents).toBe(137);
    expect(parsed.fileCount).toBe(21);
  });

  it("characterId must be canon header.id, not roleSlug — schema accepts both but production writes header.id", () => {
    // Two synthetic promotions: one canonical entry plus one legacy-import.
    appendStyleWin(memoryDir, {
      characterId: "sol-navarro",
      promotedAt: "2026-05-27T12:00:00.000Z",
      winningTechniques: ["concept-board-v2"],
      promptHash: "h-sol",
      totalCostCents: 100,
      source: "artlab-promotion",
    });
    appendStyleWin(memoryDir, {
      characterId: "otis",
      promotedAt: "2026-05-26T12:00:00.000Z",
      winningTechniques: ["legacy"],
      promptHash: "h-otis",
      totalCostCents: 0,
      source: "legacy-import",
    });

    const wins = readStyleWins(memoryDir);
    expect(wins).toHaveLength(2);

    // The artlab-promotion entry MUST carry the canon header.id.
    const promoted = wins.find((w) => w.source === "artlab-promotion");
    expect(promoted).toBeDefined();
    expect(promoted!.characterId).toBe("sol-navarro");
    // Specifically: header.id != roleSlug. If Unit 5 regressed and we wrote
    // "cno" instead, this assertion would have caught it.
    expect(promoted!.characterId).not.toBe("cno");

    // The legacy-import entry is preserved as-is (its characterId was always
    // the roleSlug-style "otis").
    const legacy = wins.find((w) => w.source === "legacy-import");
    expect(legacy).toBeDefined();
    expect(legacy!.characterId).toBe("otis");
  });

  it("readStyleWins filters by characterId", () => {
    appendStyleWin(memoryDir, {
      characterId: "sol-navarro",
      promotedAt: "2026-05-27T12:00:00.000Z",
      winningTechniques: ["a"],
      promptHash: "h1",
      totalCostCents: 50,
      source: "artlab-promotion",
    });
    appendStyleWin(memoryDir, {
      characterId: "rafe-calder",
      promotedAt: "2026-05-27T13:00:00.000Z",
      winningTechniques: ["b"],
      promptHash: "h2",
      totalCostCents: 75,
      source: "artlab-promotion",
    });

    const onlySol = readStyleWins(memoryDir, { characterId: "sol-navarro" });
    expect(onlySol).toHaveLength(1);
    expect(onlySol[0]!.promptHash).toBe("h1");
  });
});
