// src/lib/artlab/daemon/crash-recovery.ts
import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { readRunReality } from "@/lib/artlab/state/reconciler";

const STALE_HEARTBEAT_MS = 10 * 60_000;

export interface CrashRecoveryInput {
  workspaceRoot: string;
  now?: () => Date;
}

export interface CrashRecoveryResult {
  staleRunsReconciled: string[];
  leasesReleased: string[];
}

export async function reconcileCrashedRuns(input: CrashRecoveryInput): Promise<CrashRecoveryResult> {
  const now = (input.now ?? (() => new Date()))().getTime();
  const runsRoot = join(input.workspaceRoot, "runs");
  if (!existsSync(runsRoot)) return { staleRunsReconciled: [], leasesReleased: [] };
  const result: CrashRecoveryResult = { staleRunsReconciled: [], leasesReleased: [] };
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
