// src/lib/artlab/cli/ui/render.ts
//
// High-level renderers for each Tower CLI surface. These map domain data
// (queue entries, health snapshot, run state) onto the Tower-styled widgets.

import type { ArtLabQueueEntry } from "@/lib/artlab/queue/queue";
import type { ArtLabHealthSnapshot } from "@/lib/artlab/health/snapshot";
import type { ArtLabRunState } from "@/lib/artlab/types";
import { box, table, type ColumnSpec } from "./box";
import { bar, header, kvList, muted, statusDot, type KvRow } from "./widgets";
import { towerCream, towerGoldBright, towerSlate } from "./ansi";

export interface StatusViewInput {
  workspaceRoot: string;
  queued: ArtLabQueueEntry[];
  activeRuns: ArtLabRunState[];
  recentErrors: Array<{ at: string; source: string; message: string }>;
}

function ageMs(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

export function renderStatusView(input: StatusViewInput): string {
  const out: string[] = [];
  out.push(header("Engine status", input.workspaceRoot));

  const summary: KvRow[] = [
    { label: "queued", value: String(input.queued.length), status: input.queued.length > 0 ? "info" : "muted" },
    { label: "active", value: String(input.activeRuns.length), status: input.activeRuns.length > 0 ? "active" : "muted" },
    { label: "recent errors", value: String(input.recentErrors.length), status: input.recentErrors.length > 0 ? "warn" : "ok" },
  ];
  out.push(box([kvList(summary)], { title: "Engine summary" }));

  if (input.activeRuns.length > 0) {
    const columns: ColumnSpec[] = [
      { header: "runId", width: 26 },
      { header: "phase", width: 18 },
      { header: "asset", width: 18 },
      { header: "age", width: 6 },
    ];
    const rows = input.activeRuns.map((r) => [
      towerCream(r.runId.slice(0, 24)),
      towerGoldBright(r.phase),
      towerSlate(r.assetType + (r.characterId ? ` · ${r.characterId}` : "")),
      muted(ageMs(r.updatedAt)),
    ]);
    out.push(box([table(columns, rows)], { title: "Active runs" }));
  }

  if (input.queued.length > 0) {
    const columns: ColumnSpec[] = [
      { header: "runId", width: 26 },
      { header: "priority", width: 10 },
      { header: "asset", width: 14 },
      { header: "queued", width: 8 },
    ];
    const rows = input.queued.slice(0, 12).map((q) => [
      towerCream(q.runId.slice(0, 24)),
      towerGoldBright(String(q.priority)),
      towerSlate(String(q.spec.assetType ?? "?")),
      muted(ageMs(q.enqueuedAt)),
    ]);
    out.push(box([table(columns, rows)], { title: `Queue (${input.queued.length})` }));
  }

  if (input.recentErrors.length > 0) {
    const recent = input.recentErrors.slice(-5);
    const lines = recent.map((e) =>
      `${statusDot("fail")} ${towerSlate(ageMs(e.at))}  ${towerCream(e.source)}  ${muted(e.message.slice(0, 80))}`,
    );
    out.push(box(lines, { title: `Recent errors (last ${recent.length})` }));
  }

  return out.join("\n\n");
}

export function renderQueueView(queued: ArtLabQueueEntry[]): string {
  if (queued.length === 0) {
    return box([muted("(no runs queued — engine is idle)")], { title: "Queue", align: "center" });
  }
  const columns: ColumnSpec[] = [
    { header: "runId", width: 36 },
    { header: "priority", width: 12 },
    { header: "asset", width: 14 },
    { header: "request", width: 36 },
    { header: "age", width: 6 },
  ];
  const rows = queued.map((q) => [
    towerCream(q.runId),
    towerGoldBright(String(q.priority)),
    towerSlate(String(q.spec.assetType ?? "?")),
    muted(String(q.spec.request ?? "").slice(0, 36)),
    muted(ageMs(q.enqueuedAt)),
  ]);
  return box([table(columns, rows)], { title: `Queue (${queued.length})` });
}

export function renderHealthView(snapshot: ArtLabHealthSnapshot): string {
  const out: string[] = [];
  out.push(header("Engine health", snapshot.workspaceRoot));

  const spendRows: KvRow[] = [
    { label: "total spent", value: `$${(snapshot.spend.totalSpentCents / 100).toFixed(2)}` },
  ];
  for (const [runId, cents] of Object.entries(snapshot.spend.byRun)) {
    spendRows.push({ label: runId.slice(0, 28), value: `$${(cents / 100).toFixed(2)}` });
  }
  out.push(box([kvList(spendRows)], { title: "Spend" }));

  const procRows: KvRow[] = [
    { label: "active processes", value: String(snapshot.processes.activeProcessCount), status: snapshot.processes.activeProcessCount > 0 ? "active" : "muted" },
  ];
  for (const runId of snapshot.processes.runIds) procRows.push({ label: runId.slice(0, 28), value: "running", status: "active" });
  out.push(box([kvList(procRows)], { title: "Processes" }));

  const staleLeases = snapshot.leases.filter((l) => l.stale).length;
  const leaseRows: KvRow[] = [
    { label: "total leases", value: String(snapshot.leases.length), status: snapshot.leases.length > 0 ? "info" : "muted" },
    { label: "stale leases", value: String(staleLeases), status: staleLeases > 0 ? "warn" : "ok" },
  ];
  out.push(box([kvList(leaseRows)], { title: "Leases" }));

  const cleanupRows: KvRow[] = [
    { label: "orphan previews", value: String(snapshot.cleanup.orphanPreviewCount), status: snapshot.cleanup.orphanPreviewCount > 0 ? "warn" : "ok" },
    { label: "stale boards", value: String(snapshot.cleanup.staleBoardCount), status: snapshot.cleanup.staleBoardCount > 0 ? "warn" : "ok" },
  ];
  out.push(box([kvList(cleanupRows)], { title: "Cleanup" }));

  if (snapshot.speed) {
    const arrow = snapshot.speed.improvementPercent >= 0 ? "↓" : "↑";
    const speedRows: KvRow[] = [
      { label: "recent runs", value: String(snapshot.speed.recentRunCount) },
      { label: "median", value: `${snapshot.speed.medianRecentRunMs}ms` },
      { label: "baseline", value: `${snapshot.speed.baselineRunMs}ms` },
      { label: "improvement", value: `${arrow}${Math.abs(snapshot.speed.improvementPercent)}%`,
        status: snapshot.speed.improvementPercent >= 0 ? "ok" : "warn" },
    ];
    const pct = Math.max(0, Math.min(1, snapshot.speed.improvementPercent / 100));
    out.push(box([kvList(speedRows), "", bar(pct, 32)], { title: "Speed" }));
  }

  return out.join("\n\n");
}
