import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface CleanupScanResult {
  orphanPreviewCount: number;
  staleBoardCount: number;
  staleLockCount: number;
}

function countFilesRecursive(dir: string): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isFile()) count += 1;
    else if (stat.isDirectory()) count += countFilesRecursive(path);
  }
  return count;
}

export function scanCleanup(workspaceRoot: string): CleanupScanResult {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return { orphanPreviewCount: 0, staleBoardCount: 0, staleLockCount: 0 };
  let orphan = 0;
  let staleBoards = 0;
  for (const runId of readdirSync(runsDir)) {
    orphan += countFilesRecursive(join(runsDir, runId, "previews-orphan"));
    staleBoards += countFilesRecursive(join(runsDir, runId, "stale-boards"));
  }
  return { orphanPreviewCount: orphan, staleBoardCount: staleBoards, staleLockCount: 0 };
}
