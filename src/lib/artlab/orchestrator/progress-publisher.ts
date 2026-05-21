import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { writeProgressSnapshot, readRunStateSnapshot } from "../state/snapshots";

interface SpendArtifacts {
  actualCents: number;
  reservedCents: number;
}

function readSpend(runDir: string): SpendArtifacts {
  const ledgerPath = join(runDir, "provider-budget-ledger.json");
  if (!existsSync(ledgerPath)) return { actualCents: 0, reservedCents: 0 };
  try {
    const parsed = JSON.parse(readFileSync(ledgerPath, "utf8")) as { totals?: { spentCents?: number; reservedCents?: number } };
    return {
      actualCents: parsed.totals?.spentCents ?? 0,
      reservedCents: parsed.totals?.reservedCents ?? 0,
    };
  } catch {
    return { actualCents: 0, reservedCents: 0 };
  }
}

function countLeases(runDir: string): number {
  const dir = join(runDir, "slot-leases");
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith(".lease.json")).length;
}

function countReceipts(runDir: string): { completed: number; failed: number } {
  const dir = join(runDir, "inbox");
  if (!existsSync(dir)) return { completed: 0, failed: 0 };
  const files = readdirSync(dir);
  return {
    completed: files.filter((f) => f.includes("api-receipt") && !f.includes("failed")).length,
    failed: files.filter((f) => f.includes("failed")).length,
  };
}

export async function publishProgressOnce(runDir: string): Promise<void> {
  const state = readRunStateSnapshot(runDir);
  if (!state) return;
  const spend = readSpend(runDir);
  const leases = countLeases(runDir);
  const receipts = countReceipts(runDir);
  writeProgressSnapshot(runDir, {
    runId: state.runId,
    at: new Date().toISOString(),
    phase: state.phase,
    slotsCompleted: receipts.completed,
    slotsRunning: leases,
    slotsFailed: receipts.failed,
    actualSpendCents: spend.actualCents,
    reservedCents: spend.reservedCents,
  });
}

export function startProgressHeartbeat(runDir: string, intervalMs = 10_000): () => void {
  let active = true;
  const tick = async (): Promise<void> => {
    if (!active) return;
    try { await publishProgressOnce(runDir); } catch { /* swallow during teardown */ }
    if (active) setTimeout(tick, intervalMs);
  };
  void tick();
  return () => { active = false; };
}
