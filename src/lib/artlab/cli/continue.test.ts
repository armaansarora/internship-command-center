// src/lib/artlab/cli/continue.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runContinueSubcommand } from "./continue";

describe("artlab continue subcommand", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cli-cont-")); });

  it("writes a continue intent file", async () => {
    const runId = "abc-123";
    mkdirSync(join(workspaceRoot, "runs", runId), { recursive: true });
    writeFileSync(join(workspaceRoot, "runs", runId, "run-state.json"), JSON.stringify({
      runId, assetType: "character", phase: "concept-review",
      createdAt: "2026-05-20T00:00:00.000Z", updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    }));
    const result = await runContinueSubcommand({ workspaceRoot, args: [runId] });
    expect(result.exitCode).toBe(0);
    const files = readdirSync(join(workspaceRoot, "inbox", "cli"));
    expect(files.some((f) => f.startsWith(`continue-${runId}-`))).toBe(true);
  });

  it("exits 2 when runId missing", async () => {
    const result = await runContinueSubcommand({ workspaceRoot, args: [] });
    expect(result.exitCode).toBe(2);
  });

  it("exits 1 when runId does not exist", async () => {
    const result = await runContinueSubcommand({ workspaceRoot, args: ["nope"] });
    expect(result.exitCode).toBe(1);
  });

  it.each([["--help"], ["-h"]])(
    "prints usage and exits 0 when %s is passed, queueing nothing and bypassing the runDir check",
    async (flag) => {
      const result = await runContinueSubcommand({ workspaceRoot, args: [flag] });
      expect(result.exitCode).toBe(0);
      expect(result.message).toMatch(/continue/i);
      expect(result.message).toMatch(/<runId>/);
      const inboxPath = join(workspaceRoot, "inbox", "cli");
      expect(existsSync(inboxPath) ? readdirSync(inboxPath) : []).toHaveLength(0);
    },
  );

  it("treats --help anywhere in args as a help request even when args[0] is a uuid-shaped string", async () => {
    const result = await runContinueSubcommand({
      workspaceRoot,
      args: ["00000000-0000-0000-0000-000000000000", "--help"],
    });
    expect(result.exitCode).toBe(0);
    expect(result.message).toMatch(/<runId>/);
    const inboxPath = join(workspaceRoot, "inbox", "cli");
    expect(existsSync(inboxPath) ? readdirSync(inboxPath) : []).toHaveLength(0);
  });
});
