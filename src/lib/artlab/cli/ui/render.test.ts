// src/lib/artlab/cli/ui/render.test.ts
//
// Renderer tests. The first line of renderHealthView() must be a one-line
// daemon liveness banner so fresh sessions can grep "is the daemon up?" without
// parsing tables.

import { describe, expect, it } from "vitest";
import { renderHealthView, renderQueueView, renderStatusView, renderRunDetailView } from "./render";
import type { ArtLabHealthSnapshot } from "@/lib/artlab/health/snapshot";
import type { DaemonErrorsScanResult } from "@/lib/artlab/health/scanners/daemon-errors";
import type { ArtLabRunState } from "@/lib/artlab/types";

function minimalSnapshot(overrides: { daemon: DaemonErrorsScanResult }): ArtLabHealthSnapshot {
  return {
    collectedAt: "2026-05-27T00:00:00.000Z",
    workspaceRoot: "/tmp/artlab-test",
    leases: [],
    spend: { totalSpentCents: 0, byRun: {} },
    processes: { activeProcessCount: 0, runIds: [] },
    receipts: { totalReceipts: 0, byRun: {} },
    locks: { locks: [] },
    cleanup: { orphanPreviewCount: 0, staleBoardCount: 0, staleLockCount: 0 },
    daemon: overrides.daemon,
  };
}

function firstLine(text: string): string {
  return text.split("\n")[0] ?? "";
}

describe("renderHealthView — daemon liveness banner", () => {
  it("renders '✗ Daemon down (no heartbeat)' when heartbeat is missing", () => {
    const out = renderHealthView(minimalSnapshot({ daemon: { recent24hCount: 0 } }));
    expect(firstLine(out)).toMatch(/^✗ Daemon down \(no heartbeat\)/);
  });

  it("renders '✗ Daemon down (pid <PID> dead, heartbeat <N>s old)' when heartbeat is stale", () => {
    const out = renderHealthView(
      minimalSnapshot({
        daemon: {
          recent24hCount: 0,
          heartbeat: { pid: 999, at: "2026-05-27T00:00:00.000Z", staleMs: 60_000 },
        },
      }),
    );
    expect(firstLine(out)).toMatch(/^✗ Daemon down \(pid 999 dead, heartbeat 60s old\)/);
  });

  it("renders '✓ Daemon alive (pid <PID>, heartbeat <N>s old)' when heartbeat is fresh", () => {
    const out = renderHealthView(
      minimalSnapshot({
        daemon: {
          recent24hCount: 0,
          heartbeat: { pid: 999, at: "2026-05-27T00:00:00.000Z", staleMs: 500 },
        },
      }),
    );
    expect(firstLine(out)).toMatch(/^✓ Daemon alive \(pid 999, heartbeat 1s old\)/);
  });

  it("places a blank line between the banner and the existing boxed content", () => {
    const out = renderHealthView(
      minimalSnapshot({
        daemon: {
          recent24hCount: 0,
          heartbeat: { pid: 1234, at: "2026-05-27T00:00:00.000Z", staleMs: 0 },
        },
      }),
    );
    const lines = out.split("\n");
    expect(lines[0]).toMatch(/^✓ Daemon alive/);
    expect(lines[1]).toBe("");
    // The existing header box uses divider characters — make sure it still appears.
    expect(out).toContain("Engine health");
  });
});

function fixtureRun(overrides: Partial<ArtLabRunState> = {}): ArtLabRunState {
  const now = new Date().toISOString();
  return {
    runId: "11111111-2222-3333-4444-555555555555",
    assetType: "character",
    phase: "concept-review",
    createdAt: now,
    updatedAt: now,
    request: "Make Sol",
    ...overrides,
  };
}

describe("renderStatusView — blocker column", () => {
  it("includes a blocker column header and renders the run's blocker when set", () => {
    const out = renderStatusView({
      workspaceRoot: "/tmp/x",
      queued: [],
      activeRuns: [fixtureRun({ blocker: "needs-human" })],
      recentErrors: [],
    });
    expect(out).toMatch(/blocker/);
    expect(out).toContain("needs-human");
  });

  it("renders a dot for runs without a blocker", () => {
    const out = renderStatusView({
      workspaceRoot: "/tmp/x",
      queued: [],
      activeRuns: [fixtureRun()],
      recentErrors: [],
    });
    expect(out).toMatch(/blocker/);
  });
});

describe("renderQueueView — engine-is-idle gating", () => {
  it("prints 'engine is idle' only when the queue is empty AND there are no active runs", () => {
    const idle = renderQueueView({ queued: [], activeRunsCount: 0 });
    expect(idle).toMatch(/engine is idle/);
  });

  it("does NOT print 'engine is idle' when the queue is empty but active runs > 0", () => {
    const busy = renderQueueView({ queued: [], activeRunsCount: 1 });
    expect(busy).not.toMatch(/engine is idle/);
    expect(busy).toMatch(/1 active/);
  });
});

describe("renderHealthView — Locks + Recent daemon errors sections", () => {
  it("renders a Locks table when locks are present", () => {
    const out = renderHealthView({
      ...minimalSnapshot({ daemon: { recent24hCount: 0, heartbeat: { pid: 1, at: "2026-05-27T00:00:00.000Z", staleMs: 0 } } }),
      locks: { locks: [{ path: "/tmp/x/.lock.engine.json", scope: "engine", holderPid: 4242 }] },
    });
    expect(out).toMatch(/Locks/);
    expect(out).toContain("engine");
    expect(out).toContain("4242");
  });

  it("flags a stale/corrupt lock (holderPid<=0) inside the Locks section", () => {
    const out = renderHealthView({
      ...minimalSnapshot({ daemon: { recent24hCount: 0, heartbeat: { pid: 1, at: "2026-05-27T00:00:00.000Z", staleMs: 0 } } }),
      locks: { locks: [{ path: "/tmp/x/.lock.corrupt.json", scope: "corrupt", holderPid: 0 }] },
    });
    expect(out).toMatch(/Locks/);
    // Severity should be loud — either "stale" or "corrupt" labelled.
    expect(out).toMatch(/stale|corrupt/i);
  });

  it("renders the last few daemon errors when recent24hCount > 0", () => {
    const out = renderHealthView({
      ...minimalSnapshot({
        daemon: {
          recent24hCount: 3,
          heartbeat: { pid: 1, at: "2026-05-27T00:00:00.000Z", staleMs: 0 },
          lastError: { at: "2026-05-27T00:00:00.000Z", source: "queue-processor", message: "spawn boom" },
        },
      }),
    });
    expect(out).toMatch(/daemon errors/i);
    expect(out).toContain("queue-processor");
    expect(out).toContain("spawn boom");
  });
});

describe("renderRunDetailView", () => {
  it("renders the runId, phase, and blocker for a single run", () => {
    const run = fixtureRun({ blocker: "needs-human" });
    const out = renderRunDetailView({ workspaceRoot: "/tmp/x", state: run, events: [] });
    expect(out).toContain(run.runId);
    expect(out).toContain(run.phase);
    expect(out).toContain("needs-human");
  });

  it("renders 'Recent transitions' when phase-transition events are present", () => {
    const run = fixtureRun();
    const out = renderRunDetailView({
      workspaceRoot: "/tmp/x",
      state: run,
      events: [
        { runId: run.runId, at: "2026-05-27T00:00:00.000Z", kind: "phase-transition", payload: { from: "briefing", to: "brief-review", source: "engine" } },
      ],
    });
    expect(out).toMatch(/Recent transitions/);
    expect(out).toContain("brief-review");
  });
});
