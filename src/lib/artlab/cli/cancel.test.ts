// src/lib/artlab/cli/cancel.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCancelSubcommand } from "./cancel";

function seedRun(workspaceRoot: string, runId: string): void {
  const runDir = join(workspaceRoot, "runs", runId);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, "run-state.json"), JSON.stringify({
    runId,
    assetType: "character",
    phase: "concept-review",
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
    request: "x",
  }));
}

describe("artlab cancel subcommand", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cli-cancel-"));
  });

  it("writes a cancel intent file at <workspaceRoot>/inbox/cancel-<runId>.json with {runId, requestedAt}", async () => {
    const runId = "test-runid-1";
    seedRun(workspaceRoot, runId);
    const result = await runCancelSubcommand({ workspaceRoot, args: [runId] });
    expect(result.exitCode).toBe(0);
    const inboxDir = join(workspaceRoot, "inbox");
    const files = readdirSync(inboxDir);
    expect(files).toContain(`cancel-${runId}.json`);
    const body = JSON.parse(readFileSync(join(inboxDir, `cancel-${runId}.json`), "utf8"));
    expect(body.runId).toBe(runId);
    expect(typeof body.requestedAt).toBe("string");
    // ISO 8601 — confirms `new Date().toISOString()` was used.
    expect(body.requestedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("does NOT leave a *.tmp.* sibling next to the intent file (atomic temp-rename)", async () => {
    const runId = "atomic-write-check";
    seedRun(workspaceRoot, runId);
    await runCancelSubcommand({ workspaceRoot, args: [runId] });
    const files = readdirSync(join(workspaceRoot, "inbox"));
    expect(files.some((f) => f.includes(".tmp."))).toBe(false);
  });

  it("exits 2 when runId missing", async () => {
    const result = await runCancelSubcommand({ workspaceRoot, args: [] });
    expect(result.exitCode).toBe(2);
    expect(result.message).toMatch(/usage:.*artlab cancel/i);
    // Nothing written when no args.
    const inboxPath = join(workspaceRoot, "inbox");
    expect(existsSync(inboxPath) ? readdirSync(inboxPath) : []).toHaveLength(0);
  });

  it("exits 1 when runId does not exist", async () => {
    const result = await runCancelSubcommand({ workspaceRoot, args: ["does-not-exist-run"] });
    expect(result.exitCode).toBe(1);
    expect(result.message).toMatch(/no such run/i);
    const inboxPath = join(workspaceRoot, "inbox");
    expect(existsSync(inboxPath) ? readdirSync(inboxPath) : []).toHaveLength(0);
  });

  it.each([["--help"], ["-h"]])(
    "prints usage and exits 0 when %s is passed, queueing nothing and bypassing the runDir check",
    async (flag) => {
      const result = await runCancelSubcommand({ workspaceRoot, args: [flag] });
      expect(result.exitCode).toBe(0);
      expect(result.message).toMatch(/cancel/i);
      expect(result.message).toMatch(/<runId>/);
      const inboxPath = join(workspaceRoot, "inbox");
      expect(existsSync(inboxPath) ? readdirSync(inboxPath) : []).toHaveLength(0);
    },
  );
});
