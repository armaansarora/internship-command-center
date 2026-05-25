// src/lib/artlab/daemon/run-archival.ts
//
// Archives completed run directories older than ARCHIVE_AGE_DAYS into a
// tar.gz under `.artlab/engine/runs/.archive/<YYYY-MM>/<runId>.tar.gz`.
// The promotion-receipt.json is extracted to the side at
// `.archive/<YYYY-MM>/<runId>.receipt.json` so /decisions can still resolve
// the run window without rehydrating the full tarball.
//
// Only runs that are in `closed` phase and whose updatedAt is older than the
// cutoff are eligible. Active or blocked runs are never touched. Failure to
// archive any single run is non-fatal; the daemon continues.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ARCHIVE_AGE_DAYS = 30;
const ARCHIVE_AGE_MS = ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000;

export interface RunArchivalResult {
  archived: string[];
  skipped: Array<{ runId: string; reason: string }>;
}

interface RunStateLite {
  runId: string;
  phase?: string;
  updatedAt?: string;
}

function safeReadRunState(runDir: string): RunStateLite | null {
  const path = join(runDir, "run-state.json");
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")) as RunStateLite; }
  catch { return null; }
}

function archivedReceiptPath(archiveDir: string, runId: string): string {
  return join(archiveDir, `${runId}.receipt.json`);
}

function archivedTarballPath(archiveDir: string, runId: string): string {
  return join(archiveDir, `${runId}.tar.gz`);
}

export function archiveOldRuns(
  workspaceRoot: string,
  now: () => Date = () => new Date(),
): RunArchivalResult {
  const result: RunArchivalResult = { archived: [], skipped: [] };
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return result;
  const cutoffMs = now().getTime() - ARCHIVE_AGE_MS;

  for (const runId of readdirSync(runsDir)) {
    if (runId.startsWith(".")) continue; // skip .archive/ and other dotfiles
    const runDir = join(runsDir, runId);
    try { if (!statSync(runDir).isDirectory()) continue; } catch { continue; }
    const state = safeReadRunState(runDir);
    if (!state) {
      result.skipped.push({ runId, reason: "no-state" });
      continue;
    }
    if (state.phase !== "closed") {
      result.skipped.push({ runId, reason: `phase=${state.phase}` });
      continue;
    }
    if (!state.updatedAt) {
      result.skipped.push({ runId, reason: "no-updatedAt" });
      continue;
    }
    const updatedMs = new Date(state.updatedAt).getTime();
    if (!Number.isFinite(updatedMs) || updatedMs > cutoffMs) {
      result.skipped.push({ runId, reason: "too-recent" });
      continue;
    }
    const yyyymm = state.updatedAt.slice(0, 7);
    const archiveDir = join(runsDir, ".archive", yyyymm);
    if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });
    const tarball = archivedTarballPath(archiveDir, runId);
    if (existsSync(tarball)) {
      // Tarball already exists from a partial prior pass — just remove the
      // source dir.
      try { rmSync(runDir, { recursive: true, force: true }); result.archived.push(runId); }
      catch (err) { result.skipped.push({ runId, reason: `cleanup-failed: ${err instanceof Error ? err.message : String(err)}` }); }
      continue;
    }
    // Side-extract the promotion receipt for quick lookup.
    const receiptPath = join(runDir, "promotion-receipt.json");
    if (existsSync(receiptPath)) {
      try {
        const receiptBody = readFileSync(receiptPath, "utf8");
        writeFileSync(archivedReceiptPath(archiveDir, runId), receiptBody);
      } catch { /* receipt copy is best-effort */ }
    }
    // tar+gzip the run directory.
    const tarResult = spawnSync("tar", ["-czf", tarball, "-C", runsDir, runId], { encoding: "utf8" });
    if (tarResult.status !== 0) {
      result.skipped.push({ runId, reason: `tar-failed: ${tarResult.stderr.trim().slice(0, 120)}` });
      continue;
    }
    try { rmSync(runDir, { recursive: true, force: true }); result.archived.push(runId); }
    catch (err) {
      // Tarball is safe; just leave the source dir as orphan that next pass
      // will pick up via the "already exists" shortcut.
      result.skipped.push({ runId, reason: `cleanup-failed: ${err instanceof Error ? err.message : String(err)}` });
    }
  }
  return result;
}
