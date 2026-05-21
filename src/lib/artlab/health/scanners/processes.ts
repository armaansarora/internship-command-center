import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface ProcessesScanResult {
  activeProcessCount: number;
  runIds: string[];
}

export function scanProcesses(workspaceRoot: string): ProcessesScanResult {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return { activeProcessCount: 0, runIds: [] };
  let count = 0;
  const runIds: string[] = [];
  for (const runId of readdirSync(runsDir)) {
    const leaseDir = join(runsDir, runId, "slot-leases");
    if (!existsSync(leaseDir) || !statSync(leaseDir).isDirectory()) continue;
    const leases = readdirSync(leaseDir).filter((f) => f.endsWith(".lease.json"));
    if (leases.length > 0) {
      count += leases.length;
      runIds.push(runId);
    }
  }
  return { activeProcessCount: count, runIds };
}
