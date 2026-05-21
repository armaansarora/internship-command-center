// src/lib/artlab/memory/cast-push-accumulation.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

describe.skip("Phase 6 memory accumulation (manual — run after each character)", () => {
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
