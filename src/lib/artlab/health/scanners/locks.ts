import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface LockScanEntry {
  path: string;
  scope: string;
  holderPid: number;
}

export interface LockScanResult {
  locks: LockScanEntry[];
}

export function scanLocks(workspaceRoot: string): LockScanResult {
  if (!existsSync(workspaceRoot)) return { locks: [] };
  const locks: LockScanEntry[] = [];
  for (const file of readdirSync(workspaceRoot)) {
    if (!file.startsWith(".lock.") || !file.endsWith(".json")) continue;
    try {
      const parsed = JSON.parse(readFileSync(join(workspaceRoot, file), "utf8")) as { pid?: number; scope?: string };
      locks.push({
        path: join(workspaceRoot, file),
        scope: parsed.scope ?? file.replace(/^\.lock\./, "").replace(/\.json$/, ""),
        holderPid: parsed.pid ?? 0,
      });
    } catch {
      locks.push({ path: join(workspaceRoot, file), scope: file, holderPid: 0 });
    }
  }
  return { locks };
}
