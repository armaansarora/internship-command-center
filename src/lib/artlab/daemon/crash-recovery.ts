// src/lib/artlab/daemon/crash-recovery.ts
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { readRunReality } from "@/lib/artlab/state/reconciler";

const STALE_HEARTBEAT_MS = 10 * 60_000;

export interface CrashRecoveryInput {
  workspaceRoot: string;
  now?: () => Date;
  /** Process-alive checker; defaults to process.kill(pid, 0). Pluggable for tests. */
  pidAlive?: (pid: number) => boolean;
}

export interface CrashRecoveryResult {
  staleRunsReconciled: string[];
  leasesReleased: string[];
  staleLocksReleased: string[];
}

function defaultPidAlive(pid: number): boolean {
  if (pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch { return false; }
}

/**
 * Remove `<workspace>/.lock.*.json` files whose recorded PID is no longer
 * running. Locks survive crashes and pin the engine — this is what unblocks
 * a previously-crashed daemon on restart.
 */
function cleanupStaleLocks(workspaceRoot: string, pidAlive: (pid: number) => boolean): string[] {
  if (!existsSync(workspaceRoot)) return [];
  const released: string[] = [];
  for (const file of readdirSync(workspaceRoot)) {
    if (!file.startsWith(".lock.") || !file.endsWith(".json")) continue;
    const path = join(workspaceRoot, file);
    let pid = 0;
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as { pid?: number };
      if (typeof parsed.pid === "number") pid = parsed.pid;
    } catch { /* corrupt lock file is also stale */ }
    if (pid === 0 || !pidAlive(pid)) {
      try { unlinkSync(path); released.push(path); }
      catch { /* swallow */ }
    }
  }
  return released;
}

export async function reconcileCrashedRuns(input: CrashRecoveryInput): Promise<CrashRecoveryResult> {
  const now = (input.now ?? (() => new Date()))().getTime();
  const pidAlive = input.pidAlive ?? defaultPidAlive;
  const runsRoot = join(input.workspaceRoot, "runs");
  const staleLocksReleased = cleanupStaleLocks(input.workspaceRoot, pidAlive);
  if (!existsSync(runsRoot)) return { staleRunsReconciled: [], leasesReleased: [], staleLocksReleased };
  const result: CrashRecoveryResult = { staleRunsReconciled: [], leasesReleased: [], staleLocksReleased };
  for (const runId of readdirSync(runsRoot)) {
    const runDir = join(runsRoot, runId);
    if (!statSync(runDir).isDirectory()) continue;
    const reality = await readRunReality(runDir);
    if (!reality || reality.phase === "closed") continue;
    if (!reality.health.lastHeartbeatAt) continue;
    const lastHb = new Date(reality.health.lastHeartbeatAt).getTime();
    if (now - lastHb < STALE_HEARTBEAT_MS) continue;
    result.staleRunsReconciled.push(runId);
    const leasesDir = join(runDir, "slot-leases");
    if (existsSync(leasesDir)) {
      for (const file of readdirSync(leasesDir).filter((f) => f.endsWith(".lease.json"))) {
        const path = join(leasesDir, file);
        unlinkSync(path);
        result.leasesReleased.push(`${runId}/${file}`);
      }
    }
  }
  return result;
}
