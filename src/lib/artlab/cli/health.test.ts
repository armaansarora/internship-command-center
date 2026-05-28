// src/lib/artlab/cli/health.test.ts
//
// Health exit-code semantics: daemon down OR stale locks → exit 1, unless
// --soft is passed. Operator escape hatch for dashboards that don't care
// about exit codes.

import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runHealthSubcommand } from "./health";

function freshHeartbeat(): { pid: number; at: string } {
  return { pid: process.pid, at: new Date().toISOString() };
}

describe("artlab health subcommand", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-health-")); });

  it("exits 1 when there is no heartbeat (daemon down)", async () => {
    const result = await runHealthSubcommand({ workspaceRoot, args: [], log: () => {} });
    expect(result.exitCode).toBe(1);
  });

  it("exits 1 when the heartbeat is stale (daemon process gone)", async () => {
    // Heartbeat from a minute ago — well past the staleness threshold.
    const staleAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    writeFileSync(join(workspaceRoot, "daemon-heartbeat.json"), JSON.stringify({ pid: 99999, at: staleAt }));
    const result = await runHealthSubcommand({ workspaceRoot, args: [], log: () => {} });
    expect(result.exitCode).toBe(1);
  });

  it("exits 0 when the heartbeat is fresh and no locks are stale", async () => {
    writeFileSync(join(workspaceRoot, "daemon-heartbeat.json"), JSON.stringify(freshHeartbeat()));
    const result = await runHealthSubcommand({ workspaceRoot, args: [], log: () => {} });
    expect(result.exitCode).toBe(0);
  });

  it("exits 1 when locks are stale (holderPid=0 indicates a corrupt lock)", async () => {
    writeFileSync(join(workspaceRoot, "daemon-heartbeat.json"), JSON.stringify(freshHeartbeat()));
    // A corrupt .lock file → scanLocks returns holderPid=0.
    writeFileSync(join(workspaceRoot, ".lock.something.json"), "not valid json");
    const result = await runHealthSubcommand({ workspaceRoot, args: [], log: () => {} });
    expect(result.exitCode).toBe(1);
  });

  it("--soft suppresses the non-zero exit code even when the daemon is down", async () => {
    const result = await runHealthSubcommand({ workspaceRoot, args: ["--soft"], log: () => {} });
    expect(result.exitCode).toBe(0);
  });

  it("--soft suppresses the non-zero exit code even when locks are stale", async () => {
    writeFileSync(join(workspaceRoot, "daemon-heartbeat.json"), JSON.stringify(freshHeartbeat()));
    writeFileSync(join(workspaceRoot, ".lock.something.json"), "not valid json");
    const result = await runHealthSubcommand({ workspaceRoot, args: ["--soft"], log: () => {} });
    expect(result.exitCode).toBe(0);
  });

  it("renders the health view via the same renderer regardless of exit code", async () => {
    const lines: string[] = [];
    await runHealthSubcommand({ workspaceRoot, args: [], log: (line) => lines.push(line) });
    expect(lines.join("\n")).toMatch(/Engine health/);
  });

  it("prints usage and exits 0 on --help", async () => {
    const lines: string[] = [];
    const result = await runHealthSubcommand({ workspaceRoot, args: ["--help"], log: (line) => lines.push(line) });
    expect(result.exitCode).toBe(0);
    expect(lines.join("\n")).toMatch(/--soft/);
  });
});
