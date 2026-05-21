// src/lib/artlab/migration/import-otis.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importOtisIntoArtLab } from "./import-otis";

describe("import-otis", () => {
  let workspaceRoot: string;
  let publicArtRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-mig-otis-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-public-"));
    mkdirSync(join(publicArtRoot, "lobby", "otis"), { recursive: true });
    writeFileSync(join(publicArtRoot, "lobby", "otis", "idle.webp"), Buffer.from([1, 2, 3]));
  });

  it("creates a runs/otis-import-2026-05-XX directory with a closed run-state.json", async () => {
    const result = await importOtisIntoArtLab({ workspaceRoot, publicArtRoot });
    expect(result.runId).toMatch(/^otis-import-/);
    const runDir = join(workspaceRoot, "runs", result.runId);
    expect(existsSync(join(runDir, "run-state.json"))).toBe(true);
    const state = JSON.parse(readFileSync(join(runDir, "run-state.json"), "utf8"));
    expect(state.phase).toBe("closed");
    expect(state.assetType).toBe("character");
    expect(state.characterId).toBe("otis");
  });

  it("does not touch public/art (read-only import)", async () => {
    const before = readFileSync(join(publicArtRoot, "lobby", "otis", "idle.webp"));
    await importOtisIntoArtLab({ workspaceRoot, publicArtRoot });
    const after = readFileSync(join(publicArtRoot, "lobby", "otis", "idle.webp"));
    expect(after.equals(before)).toBe(true);
  });

  it("records the import as a memory-style win", async () => {
    await importOtisIntoArtLab({ workspaceRoot, publicArtRoot });
    const winsPath = join(workspaceRoot, "memory", "style-wins.jsonl");
    expect(existsSync(winsPath)).toBe(true);
    const lines = readFileSync(winsPath, "utf8").trim().split("\n");
    const otisWin = lines.map((l) => JSON.parse(l)).find((w) => w.characterId === "otis");
    expect(otisWin).toBeTruthy();
    expect(otisWin.source).toBe("legacy-import");
  });
});
