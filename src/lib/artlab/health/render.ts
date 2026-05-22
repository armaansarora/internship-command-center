import type { ArtLabHealthSnapshot } from "./snapshot";

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function renderArtLabHealth(snapshot: ArtLabHealthSnapshot): string {
  const lines: string[] = [];
  lines.push("ArtLab Health");
  lines.push(`Collected at: ${snapshot.collectedAt}`);
  lines.push(`Workspace: ${snapshot.workspaceRoot}`);
  lines.push("");
  lines.push("Spend");
  lines.push(`  total: ${dollars(snapshot.spend.totalSpentCents)}`);
  for (const [runId, cents] of Object.entries(snapshot.spend.byRun)) {
    lines.push(`  ${runId}: ${dollars(cents)}`);
  }
  lines.push("");
  lines.push("Processes");
  lines.push(`  active processes: ${snapshot.processes.activeProcessCount}`);
  for (const runId of snapshot.processes.runIds) {
    lines.push(`  active run: ${runId}`);
  }
  lines.push("");
  lines.push("Leases");
  lines.push(`  total leases: ${snapshot.leases.length}`);
  const stale = snapshot.leases.filter((l) => l.stale).length;
  if (stale > 0) lines.push(`  stale leases: ${stale}`);
  lines.push("");
  lines.push("Receipts");
  lines.push(`  total receipts: ${snapshot.receipts.totalReceipts}`);
  lines.push("");
  lines.push("Locks");
  lines.push(`  total locks: ${snapshot.locks.locks.length}`);
  lines.push("");
  lines.push("Cleanup");
  lines.push(`  orphan previews: ${snapshot.cleanup.orphanPreviewCount}`);
  lines.push(`  stale boards: ${snapshot.cleanup.staleBoardCount}`);
  if (snapshot.speed) {
    lines.push("");
    lines.push("Speed");
    lines.push(`  recent runs: ${snapshot.speed.recentRunCount}`);
    lines.push(`  median run: ${snapshot.speed.medianRecentRunMs}ms`);
    lines.push(`  baseline:   ${snapshot.speed.baselineRunMs}ms`);
    const arrow = snapshot.speed.improvementPercent >= 0 ? "↓" : "↑";
    lines.push(`  improvement: ${arrow}${Math.abs(snapshot.speed.improvementPercent)}%`);
  }
  return lines.join("\n");
}
