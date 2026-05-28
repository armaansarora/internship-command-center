// src/lib/artlab/cli/status.test.ts
//
// `artlab status [runId]` — when invoked without an argument, lists the
// active runs + queue + recent errors (global view). When given a runId,
// renders the single-run detail view. Malformed runIds must be rejected
// gracefully (exit 2) instead of throwing a stack trace.

import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runStatusSubcommand } from "./status";
import { writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import type { ArtLabRunState } from "@/lib/artlab/types";

function seedRun(workspaceRoot: string, runId: string, phase: ArtLabRunState["phase"]): void {
  const runDir = join(workspaceRoot, "runs", runId);
  mkdirSync(runDir, { recursive: true });
  const now = new Date().toISOString();
  writeRunStateSnapshot(runDir, {
    runId,
    assetType: "character",
    phase,
    createdAt: now,
    updatedAt: now,
    phaseStartedAt: now,
    request: `Fixture run ${runId} at ${phase}`,
  });
}

describe("artlab status subcommand", () => {
  let workspaceRoot: string;
  let lines: string[];
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-status-"));
    lines = [];
  });

  it("renders the global view when no runId is passed", async () => {
    seedRun(workspaceRoot, "11111111-2222-3333-4444-555555555555", "concept-review");
    seedRun(workspaceRoot, "22222222-2222-3333-4444-555555555555", "briefing");
    const result = await runStatusSubcommand({
      workspaceRoot,
      args: [],
      log: (line) => lines.push(line),
    });
    expect(result.exitCode).toBe(0);
    const out = lines.join("\n");
    expect(out).toMatch(/Engine status/);
    // Both runs should appear in the global "Active runs" view.
    expect(out).toContain("11111111");
    expect(out).toContain("22222222");
  });

  it("renders the single-run detail view when runId is passed", async () => {
    const runId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    seedRun(workspaceRoot, runId, "concept-review");
    const result = await runStatusSubcommand({
      workspaceRoot,
      args: [runId],
      log: (line) => lines.push(line),
    });
    expect(result.exitCode).toBe(0);
    const out = lines.join("\n");
    // The detail view contains the runId + phase prominently.
    expect(out).toContain(runId);
    expect(out).toMatch(/concept-review/);
  });

  it("exits 1 with a friendly message when runId does not exist", async () => {
    const errLines: string[] = [];
    const result = await runStatusSubcommand({
      workspaceRoot,
      args: ["12345678-1234-5678-9abc-def012345678"],
      log: (line) => errLines.push(line),
    });
    expect(result.exitCode).toBe(1);
    expect(errLines.join("\n")).toMatch(/not found/i);
  });

  it("exits 2 on a malformed runId (not a UUID)", async () => {
    const errLines: string[] = [];
    const result = await runStatusSubcommand({
      workspaceRoot,
      args: ["definitely-not-a-uuid"],
      log: (line) => errLines.push(line),
    });
    expect(result.exitCode).toBe(2);
    expect(errLines.join("\n")).toMatch(/uuid|invalid/i);
  });

  it("--help prints usage and exits 0", async () => {
    const result = await runStatusSubcommand({
      workspaceRoot,
      args: ["--help"],
      log: (line) => lines.push(line),
    });
    expect(result.exitCode).toBe(0);
    expect(lines.join("\n")).toMatch(/\[runId\]/);
  });
});
