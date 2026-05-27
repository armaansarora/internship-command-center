// src/lib/artlab/cli/produce.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runProduceSubcommand } from "./produce";

describe("artlab produce subcommand", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cli-prod-")); });

  it("writes a produce intent into inbox/cli/produce-<runId>.json", async () => {
    const result = await runProduceSubcommand({
      workspaceRoot,
      args: ["make", "Sol", "Navarro"],
    });
    expect(result.exitCode).toBe(0);
    expect(result.runId).toMatch(/^[0-9a-f-]{36}$/);
    const files = readdirSync(join(workspaceRoot, "inbox", "cli"));
    expect(files).toHaveLength(1);
    const body = JSON.parse(readFileSync(join(workspaceRoot, "inbox", "cli", files[0]!), "utf8"));
    expect(body.request).toBe("make Sol Navarro");
  });

  it("exits 2 with empty args", async () => {
    const result = await runProduceSubcommand({ workspaceRoot, args: [] });
    expect(result.exitCode).toBe(2);
  });

  it.each([["--help"], ["-h"]])(
    "prints usage and exits 0 when %s is passed, queueing nothing",
    async (flag) => {
      const result = await runProduceSubcommand({ workspaceRoot, args: [flag] });
      expect(result.exitCode).toBe(0);
      expect(result.message).toMatch(/produce/i);
      expect(result.message).toMatch(/<request>/);
      expect(result.runId).toBeUndefined();
      const inboxPath = join(workspaceRoot, "inbox", "cli");
      expect(existsSync(inboxPath) ? readdirSync(inboxPath) : []).toHaveLength(0);
    },
  );

  it("treats --help anywhere in args as a help request without queueing", async () => {
    const result = await runProduceSubcommand({
      workspaceRoot,
      args: ["make", "Sol", "--help"],
    });
    expect(result.exitCode).toBe(0);
    expect(result.message).toMatch(/<request>/);
    expect(result.runId).toBeUndefined();
    const inboxPath = join(workspaceRoot, "inbox", "cli");
    expect(existsSync(inboxPath) ? readdirSync(inboxPath) : []).toHaveLength(0);
  });
});
