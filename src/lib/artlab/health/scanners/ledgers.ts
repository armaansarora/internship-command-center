import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface LedgerScanResult {
  totalSpentCents: number;
  byRun: Record<string, number>;
}

export function scanLedgers(workspaceRoot: string): LedgerScanResult {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return { totalSpentCents: 0, byRun: {} };
  const byRun: Record<string, number> = {};
  let total = 0;
  for (const runId of readdirSync(runsDir)) {
    const runDir = join(runsDir, runId);
    if (!statSync(runDir).isDirectory()) continue;
    const ledgerPath = join(runDir, "provider-budget-ledger.json");
    if (!existsSync(ledgerPath)) continue;
    try {
      const parsed = JSON.parse(readFileSync(ledgerPath, "utf8")) as { totals?: { spentCents?: number } };
      const spent = parsed.totals?.spentCents ?? 0;
      byRun[runId] = spent;
      total += spent;
    } catch {
      byRun[runId] = 0;
    }
  }
  return { totalSpentCents: total, byRun };
}
