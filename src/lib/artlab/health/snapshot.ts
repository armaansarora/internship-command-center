import { scanLeases, type LeaseScanEntry } from "./scanners/leases";
import { scanLedgers, type LedgerScanResult } from "./scanners/ledgers";
import { scanProcesses, type ProcessesScanResult } from "./scanners/processes";
import { scanReceipts, type ReceiptsScanResult } from "./scanners/receipts";
import { scanLocks, type LockScanResult } from "./scanners/locks";
import { scanCleanup, type CleanupScanResult } from "./scanners/cleanup";
import { scanDaemonErrors, type DaemonErrorsScanResult } from "./scanners/daemon-errors";
import { readMeasurements } from "@/lib/artlab/speed/measure";
import { readBaseline } from "@/lib/artlab/migration/baseline-recorder";

export interface SpeedSummary {
  medianRecentRunMs: number;
  baselineRunMs: number;
  improvementPercent: number;
  recentRunCount: number;
}

export interface ArtLabHealthSnapshot {
  collectedAt: string;
  workspaceRoot: string;
  leases: LeaseScanEntry[];
  spend: LedgerScanResult;
  processes: ProcessesScanResult;
  receipts: ReceiptsScanResult;
  locks: LockScanResult;
  cleanup: CleanupScanResult;
  speed?: SpeedSummary;
  daemon: DaemonErrorsScanResult;
}

async function buildSpeedSummary(workspaceRoot: string): Promise<SpeedSummary | undefined> {
  const recent = await readMeasurements({ workspaceRoot, label: "rafe-run" });
  if (recent.length === 0) return undefined;
  const sorted = recent.map((m) => m.durationMs).sort((a, b) => a - b);
  const median = sorted[Math.floor((sorted.length - 1) / 2)] ?? 0;
  const baseline = await readBaseline({ workspaceRoot, label: "phase-4-rafe-baseline" });
  const baselineMs = baseline?.wallClockMs ?? median;
  const improvementPercent = baselineMs > 0 ? Math.round(((baselineMs - median) / baselineMs) * 100) : 0;
  return {
    medianRecentRunMs: median,
    baselineRunMs: baselineMs,
    improvementPercent,
    recentRunCount: recent.length,
  };
}

export async function buildArtLabHealthSnapshot(input: string | { workspaceRoot: string }): Promise<ArtLabHealthSnapshot> {
  const workspaceRoot = typeof input === "string" ? input : input.workspaceRoot;
  return {
    collectedAt: new Date().toISOString(),
    workspaceRoot,
    leases: scanLeases(workspaceRoot),
    spend: scanLedgers(workspaceRoot),
    processes: scanProcesses(workspaceRoot),
    receipts: scanReceipts(workspaceRoot),
    locks: scanLocks(workspaceRoot),
    cleanup: scanCleanup(workspaceRoot),
    speed: await buildSpeedSummary(workspaceRoot),
    daemon: scanDaemonErrors(workspaceRoot),
  };
}
