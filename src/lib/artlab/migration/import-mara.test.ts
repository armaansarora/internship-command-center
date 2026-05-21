// src/lib/artlab/migration/import-mara.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importMaraIntoArtLab } from "./import-mara";

describe("import-mara", () => {
  let workspaceRoot: string;
  let publicArtRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-mig-mara-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-public-"));
    mkdirSync(join(publicArtRoot, "penthouse", "ceo"), { recursive: true });
    writeFileSync(join(publicArtRoot, "penthouse", "ceo", "idle.webp"), Buffer.from([10, 20, 30]));
  });

  it("creates a runs/mara-import-<date> with closed phase + ceo characterId", async () => {
    const result = await importMaraIntoArtLab({ workspaceRoot, publicArtRoot });
    expect(result.runId).toMatch(/^mara-import-/);
    const state = JSON.parse(readFileSync(join(workspaceRoot, "runs", result.runId, "run-state.json"), "utf8"));
    expect(state.phase).toBe("closed");
    expect(state.characterId).toBe("ceo");
  });

  it("appends ceo to style-wins.jsonl", async () => {
    await importMaraIntoArtLab({ workspaceRoot, publicArtRoot });
    const wins = readFileSync(join(workspaceRoot, "memory", "style-wins.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(wins.some((w) => w.characterId === "ceo")).toBe(true);
  });
});
