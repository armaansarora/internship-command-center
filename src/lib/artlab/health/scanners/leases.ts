import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const STALE_MS = 10 * 60_000;

export interface LeaseScanEntry {
  runId: string;
  slotId: string;
  acquiredAt: string;
  stale: boolean;
}

export function scanLeases(workspaceRoot: string): LeaseScanEntry[] {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return [];
  const out: LeaseScanEntry[] = [];
  for (const runId of readdirSync(runsDir)) {
    const leaseDir = join(runsDir, runId, "slot-leases");
    if (!existsSync(leaseDir) || !statSync(leaseDir).isDirectory()) continue;
    for (const file of readdirSync(leaseDir).filter((f) => f.endsWith(".lease.json"))) {
      try {
        const parsed = JSON.parse(readFileSync(join(leaseDir, file), "utf8")) as { acquiredAt?: string };
        const acquiredAt = parsed.acquiredAt ?? new Date().toISOString();
        const ageMs = Date.now() - new Date(acquiredAt).getTime();
        out.push({
          runId,
          slotId: file.replace(/\.lease\.json$/, ""),
          acquiredAt,
          stale: ageMs > STALE_MS,
        });
      } catch {
        out.push({ runId, slotId: file, acquiredAt: new Date().toISOString(), stale: true });
      }
    }
  }
  return out;
}
