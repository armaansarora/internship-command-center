// src/lib/artlab/migration/import-otis.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { snapshotPromotedState } from "./promoted-state-snapshot";
import { writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { appendStyleWin } from "@/lib/artlab/memory/style-ledger";

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
  writeRunStateSnapshot(runDir, {
    runId,
    assetType: "character",
    characterId: "otis",
    phase: "closed",
    createdAt: now,
    updatedAt: now,
    request: "[migration import] otis — pre-existing promoted state",
    sourceSurface: "migration",
  });
  writeFileSync(join(runDir, "promoted-snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n");
  const memoryDir = join(input.workspaceRoot, "memory");
  if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });
  appendStyleWin(memoryDir, {
    characterId: "otis",
    promotedAt: now,
    winningTechniques: ["legacy-import"],
    promptHash: "legacy",
    totalCostCents: 0,
    source: "legacy-import",
    fileCount: snapshot.entries.length,
    note: "Pre-ArtLab Otis baseline preserved verbatim from legacy CPE.",
  });
  return { runId, importedFileCount: snapshot.entries.length };
}
