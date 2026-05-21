// src/lib/artlab/migration/import-mara.ts
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { snapshotPromotedState } from "./promoted-state-snapshot";

export interface ImportMaraInput {
  workspaceRoot: string;
  publicArtRoot: string;
}

export interface ImportMaraResult {
  runId: string;
  importedFileCount: number;
}

export async function importMaraIntoArtLab(input: ImportMaraInput): Promise<ImportMaraResult> {
  const today = new Date().toISOString().slice(0, 10);
  const runId = `mara-import-${today}`;
  const runDir = join(input.workspaceRoot, "runs", runId);
  mkdirSync(runDir, { recursive: true });
  const promotedDir = join(input.publicArtRoot, "penthouse", "ceo");
  const snapshot = await snapshotPromotedState({ rootDir: promotedDir });
  const now = new Date().toISOString();
  const state = {
    runId,
    assetType: "character" as const,
    characterId: "ceo",
    phase: "closed" as const,
    createdAt: now,
    updatedAt: now,
    request: "[migration import] mara voss / ceo — pre-existing promoted state",
    sourceSurface: "migration" as const,
  };
  writeFileSync(join(runDir, "run-state.json"), JSON.stringify(state, null, 2) + "\n");
  writeFileSync(join(runDir, "promoted-snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n");
  const memoryDir = join(input.workspaceRoot, "memory");
  if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });
  appendFileSync(join(memoryDir, "style-wins.jsonl"), JSON.stringify({
    characterId: "ceo",
    promotedAt: now,
    source: "legacy-import",
    fileCount: snapshot.entries.length,
    note: "Pre-ArtLab Mara Voss / CEO baseline preserved verbatim from legacy CPE.",
  }) + "\n");
  return { runId, importedFileCount: snapshot.entries.length };
}
