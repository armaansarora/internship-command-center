// src/lib/artlab/cli/answer.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAnswerSubcommand } from "./answer";

describe("artlab answer subcommand", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cli-ans-")); });

  it("writes an answer intent with runId + answer text", async () => {
    const runId = "abc-123";
    mkdirSync(join(workspaceRoot, "runs", runId), { recursive: true });
    writeFileSync(join(workspaceRoot, "runs", runId, "run-state.json"), JSON.stringify({
      runId, assetType: "character", phase: "concept-review",
      createdAt: "2026-05-20T00:00:00.000Z", updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    }));
    const result = await runAnswerSubcommand({ workspaceRoot, args: [runId, "approve direction 2"] });
    expect(result.exitCode).toBe(0);
    const files = readdirSync(join(workspaceRoot, "inbox", "cli"));
    const intent = files.find((f) => f.startsWith(`answer-${runId}-`))!;
    const body = JSON.parse(readFileSync(join(workspaceRoot, "inbox", "cli", intent), "utf8"));
    expect(body.answer).toBe("approve direction 2");
  });

  it("exits 2 when answer text missing", async () => {
    const result = await runAnswerSubcommand({ workspaceRoot, args: ["some-run-id"] });
    expect(result.exitCode).toBe(2);
  });

  it.each([["--help"], ["-h"]])(
    "prints usage and exits 0 when %s is passed, queueing nothing and bypassing the runDir check",
    async (flag) => {
      const result = await runAnswerSubcommand({ workspaceRoot, args: [flag] });
      expect(result.exitCode).toBe(0);
      expect(result.message).toMatch(/answer/i);
      expect(result.message).toMatch(/<runId>/);
      const inboxPath = join(workspaceRoot, "inbox", "cli");
      expect(existsSync(inboxPath) ? readdirSync(inboxPath) : []).toHaveLength(0);
    },
  );

  it("treats --help anywhere in args as a help request even when args[0] is a uuid-shaped string", async () => {
    const result = await runAnswerSubcommand({
      workspaceRoot,
      args: ["00000000-0000-0000-0000-000000000000", "--help"],
    });
    expect(result.exitCode).toBe(0);
    expect(result.message).toMatch(/<runId>/);
    const inboxPath = join(workspaceRoot, "inbox", "cli");
    expect(existsSync(inboxPath) ? readdirSync(inboxPath) : []).toHaveLength(0);
  });
});
