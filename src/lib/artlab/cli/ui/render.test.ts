// src/lib/artlab/cli/ui/render.test.ts
//
// Renderer tests. The first line of renderHealthView() must be a one-line
// daemon liveness banner so fresh sessions can grep "is the daemon up?" without
// parsing tables.

import { describe, expect, it } from "vitest";
import { renderHealthView } from "./render";
import type { ArtLabHealthSnapshot } from "@/lib/artlab/health/snapshot";
import type { DaemonErrorsScanResult } from "@/lib/artlab/health/scanners/daemon-errors";

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
