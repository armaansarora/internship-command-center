// src/lib/artlab/migration/import-otis.ts
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { snapshotPromotedState } from "./promoted-state-snapshot";

export interface ImportOtisInput {
  workspaceRoot: string;
  publicArtRoot: string;
}

export interface ImportOtisResult {
  runId: string;
  importedFileCount: number;
}

export async function importOtisIntoArtLab(input: ImportOtisInput): Promise<ImportOtisResult> {
  const today = new Date().toISOString().slice(0, 10);
  const runId = `otis-import-${today}`;
  const runDir = join(input.workspaceRoot, "runs", runId);
  mkdirSync(runDir, { recursive: true });
  const promotedDir = join(input.publicArtRoot, "lobby", "otis");
  const snapshot = await snapshotPromotedState({ rootDir: promotedDir });
  const now = new Date().toISOString();
  const state = {
    runId,
    assetType: "character" as const,
    characterId: "otis",
    phase: "closed" as const,
    createdAt: now,
    updatedAt: now,
    request: "[migration import] otis — pre-existing promoted state",
    sourceSurface: "migration" as const,
  };
  writeFileSync(join(runDir, "run-state.json"), JSON.stringify(state, null, 2) + "\n");
  writeFileSync(join(runDir, "promoted-snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n");
  const memoryDir = join(input.workspaceRoot, "memory");
  if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });
  const win = {
    characterId: "otis",
    promotedAt: now,
    source: "legacy-import",
    fileCount: snapshot.entries.length,
    note: "Pre-ArtLab Otis baseline preserved verbatim from legacy CPE.",
  };
  appendFileSync(join(memoryDir, "style-wins.jsonl"), JSON.stringify(win) + "\n");
  return { runId, importedFileCount: snapshot.entries.length };
}
