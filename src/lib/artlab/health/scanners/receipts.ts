import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface ReceiptsScanResult {
  totalReceipts: number;
  byRun: Record<string, number>;
}

export function scanReceipts(workspaceRoot: string): ReceiptsScanResult {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return { totalReceipts: 0, byRun: {} };
  const byRun: Record<string, number> = {};
  let total = 0;
  for (const runId of readdirSync(runsDir)) {
    const inbox = join(runsDir, runId, "inbox");
    if (!existsSync(inbox) || !statSync(inbox).isDirectory()) continue;
    const count = readdirSync(inbox).filter((f) => f.includes("api-receipt")).length;
    byRun[runId] = count;
    total += count;
  }
  return { totalReceipts: total, byRun };
}
