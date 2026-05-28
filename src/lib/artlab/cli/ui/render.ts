// src/lib/artlab/cli/ui/render.ts
//
// High-level renderers for each Tower CLI surface. These map domain data
// (queue entries, health snapshot, run state) onto the Tower-styled widgets.

import type { ArtLabQueueEntry } from "@/lib/artlab/queue/queue";
import type { ArtLabHealthSnapshot } from "@/lib/artlab/health/snapshot";
import type { ArtLabRunState } from "@/lib/artlab/types";
import type { ArtLabEvent } from "@/lib/artlab/state/events";
import { formatDaemonBanner } from "@/lib/artlab/health/scanners/daemon-errors";
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
      { header: "blocker", width: 22 },
      { header: "asset", width: 18 },
      { header: "age", width: 6 },
    ];
    const rows = input.activeRuns.map((r) => [
      towerCream(r.runId.slice(0, 24)),
      towerGoldBright(r.phase),
      r.blocker ? statusDot("warn") + " " + towerSlate(r.blocker) : muted("·"),
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

export interface QueueViewInput {
  queued: ArtLabQueueEntry[];
  /**
   * Active run count (non-empty runs/<runId>/run-state.json that aren't
   * closed). When > 0, suppress the "engine is idle" message even when the
   * queue is empty — a run can be actively processing without anything else
   * in the queue, and the operator should know it's still alive.
   */
  activeRunsCount?: number;
}

export function renderQueueView(input: ArtLabQueueEntry[] | QueueViewInput): string {
  const queued = Array.isArray(input) ? input : input.queued;
  const activeRunsCount = Array.isArray(input) ? 0 : (input.activeRunsCount ?? 0);
  if (queued.length === 0) {
    const message = activeRunsCount > 0
      ? `(no runs queued — ${activeRunsCount} active)`
      : "(no runs queued — engine is idle)";
    return box([muted(message)], { title: "Queue", align: "center" });
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

export interface RunDetailViewInput {
  workspaceRoot: string;
  state: ArtLabRunState;
  events: ArtLabEvent[];
}

/**
 * Single-run detail view rendered by `artlab status <runId>`. Includes the
 * run header (id + phase + blocker + asset), a kv summary, and the last 10
 * phase-transition events for context.
 */
export function renderRunDetailView(input: RunDetailViewInput): string {
  const out: string[] = [];
  out.push(header(`Run ${input.state.runId}`, input.state.assetType));

  const summary: KvRow[] = [
    { label: "phase", value: input.state.phase, status: "active" },
    { label: "blocker", value: input.state.blocker ?? "·", status: input.state.blocker ? "warn" : "muted" },
    { label: "asset", value: input.state.assetType, status: "info" },
  ];
  if (input.state.characterId) summary.push({ label: "characterId", value: input.state.characterId });
  if (input.state.bundleId) summary.push({ label: "bundleId", value: input.state.bundleId });
  if (input.state.sourceSurface) summary.push({ label: "source", value: input.state.sourceSurface });
  summary.push({ label: "created", value: ageMs(input.state.createdAt) + " ago" });
  summary.push({ label: "updated", value: ageMs(input.state.updatedAt) + " ago" });
  if (input.state.phaseStartedAt) {
    summary.push({ label: "phase age", value: ageMs(input.state.phaseStartedAt) });
  }
  if (input.state.promotedPackId) summary.push({ label: "promoted pack", value: input.state.promotedPackId });
  out.push(box([kvList(summary)], { title: "Run summary" }));

  out.push(box([muted(input.state.request)], { title: "Request" }));

  const transitions = input.events
    .filter((e) => e.kind === "phase-transition")
    .slice(-10);
  if (transitions.length > 0) {
    const columns: ColumnSpec[] = [
      { header: "at", width: 8 },
      { header: "from", width: 18 },
      { header: "to", width: 18 },
      { header: "source", width: 24 },
    ];
    const rows = transitions.map((e) => {
      const payload = e.payload as { from?: string; to?: string; source?: string };
      return [
        muted(ageMs(e.at)),
        towerSlate(String(payload.from ?? "?")),
        towerGoldBright(String(payload.to ?? "?")),
        towerCream(String(payload.source ?? "?")),
      ];
    });
    out.push(box([table(columns, rows)], { title: `Recent transitions (${transitions.length})` }));
  }

  return out.join("\n\n");
}

export function renderHealthView(snapshot: ArtLabHealthSnapshot): string {
  const out: string[] = [];
  // First line: daemon liveness banner. Plain ASCII / Unicode glyphs, no ANSI
  // escapes — must stay grep-able for fresh sessions that pipe `artlab health`
  // through `head -1` to answer "is the daemon up?".
  out.push(formatDaemonBanner(snapshot.daemon));
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

  // Locks section: every advisory lock the daemon writes lives under
  // workspaceRoot/.lock.*.json. A corrupt/unparseable lock (holderPid=0)
  // means the daemon either crashed mid-write or someone else dropped a
  // bogus file — bump severity to "warn" in either case so it isn't
  // mistaken for a healthy lock.
  if (snapshot.locks.locks.length > 0) {
    const columns: ColumnSpec[] = [
      { header: "scope", width: 16 },
      { header: "pid", width: 8 },
      { header: "state", width: 12 },
    ];
    const rows = snapshot.locks.locks.map((l) => {
      const isStale = l.holderPid <= 0;
      return [
        towerCream(l.scope),
        towerGoldBright(String(l.holderPid)),
        isStale ? statusDot("warn") + " " + towerSlate("stale/corrupt") : statusDot("ok") + " " + towerSlate("held"),
      ];
    });
    out.push(box([table(columns, rows)], { title: `Locks (${snapshot.locks.locks.length})` }));
  }

  // Recent daemon errors section: tail of daemon-errors.jsonl. The
  // last 5 are surfaced (when present) so fresh sessions can spot a
  // recurring failure (e.g., supervisor spawn loop) without ssh'ing.
  if (snapshot.daemon.recent24hCount > 0) {
    const last = snapshot.daemon.lastError;
    const lines: string[] = [
      `${statusDot("warn")} ${towerCream(`${snapshot.daemon.recent24hCount} recent errors (24h)`)}`,
    ];
    if (last) {
      lines.push(`${muted("    last:")} ${towerCream(last.source)}  ${towerSlate(last.message.slice(0, 120))}`);
    }
    out.push(box(lines, { title: "Recent daemon errors" }));
  }

  return out.join("\n\n");
}
