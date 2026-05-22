// src/lib/artlab/cli/daemon-run.test.ts
import { describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDaemonRunSubcommand } from "./daemon-run";
import { createDaemonContext } from "@/lib/artlab/daemon/entry";

describe("runDaemonRunSubcommand", () => {
  it("invokes the loop with the constructed context and returns 0", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-drun-"));
    const logs: string[] = [];
    const loop = vi.fn(async () => { /* no-op */ });
    const code = await runDaemonRunSubcommand({
      workspaceRoot,
      log: (l) => logs.push(l),
      buildContext: () => createDaemonContext({
        workspaceRoot,
        telegramPoller: { tick: vi.fn().mockResolvedValue(undefined) },
        queueProcessor: { tick: vi.fn().mockResolvedValue(undefined) },
      }),
      runForever: loop,
    });
    expect(code).toBe(0);
    expect(loop).toHaveBeenCalledOnce();
    expect(logs.some((l) => /online|daemon/i.test(l))).toBe(true);
    expect(logs.some((l) => /shutdown/i.test(l))).toBe(true);
  });

  it("returns 1 and records a structured error when bootstrap throws", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-drun-err-"));
    const logs: string[] = [];
    const code = await runDaemonRunSubcommand({
      workspaceRoot,
      log: (l) => logs.push(l),
      buildContext: () => { throw new Error("ctx build failed"); },
    });
    expect(code).toBe(1);
    expect(logs.some((l) => l.includes("bootstrap failed"))).toBe(true);
  });
});
