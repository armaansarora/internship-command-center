// src/lib/artlab/cli/run-worker.test.ts
//
// Unit 5 follow-up Issue #3: the run-worker's queue-spec characterId
// preference is the load-bearing contract that lets the daemon recover
// from crashed run-state without re-routing the natural-language request
// (which could land on a different roleSlug if intake heuristics evolved
// between enqueue and dequeue).
//
// These tests exercise the bootstrap path only — `maxTransitions: 0`
// skips the deterministic state-machine loop so we don't need to mock
// every runner. The bootstrap path is the entire surface of the bug
// (Issue #3 from the code-quality review): does the worker honor a
// queue-spec characterId over what `routeRequest(description)` would
// have returned?

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { runWorkerSubcommand } from "./run-worker";
import { readRunStateSnapshot } from "@/lib/artlab/state/snapshots";

describe("runWorkerSubcommand — bootstrap characterId resolution", () => {
  let workspaceRoot: string;
  const noopLog = (_: string): void => {};

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-run-worker-"));
  });
  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  function writeQueueEntry(
    runId: string,
    spec: Record<string, unknown>,
  ): void {
    const runDir = join(workspaceRoot, "runs", runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(
      join(runDir, "queue-entry.json"),
      JSON.stringify({
        runId,
        priority: "default",
        enqueuedAt: new Date().toISOString(),
        spec,
      }),
    );
  }

  it("prefers queue-spec characterId over routeRequest outcome (issue #3)", async () => {
    // The spec carries `rafe-calder` (Rafe Calder lives at briefing-room).
    // The request text mentions Sol Navarro by name, which routeRequest
    // would otherwise match. The fix asserts: when the enqueuer has
    // already resolved canon and pinned characterId on the queue spec,
    // the run-worker honors that pin rather than re-routing the request.
    const runId = randomUUID();
    writeQueueEntry(runId, {
      request: "make Sol Navarro with a navy jacket",
      characterId: "rafe-calder",
      sourceSurface: "artlab-mcp",
    });
    const result = await runWorkerSubcommand({
      workspaceRoot,
      args: [runId],
      log: noopLog,
      maxTransitions: 0,
      providerId: "local-mock",
    });
    expect(result.exitCode).toBe(0);
    const state = readRunStateSnapshot(join(workspaceRoot, "runs", runId));
    expect(state).not.toBeNull();
    expect(state!.characterId).toBe("rafe-calder");
    // Sanity: the request text is preserved on state.request even though
    // it doesn't match the pinned characterId.
    expect(state!.request).toBe("make Sol Navarro with a navy jacket");
  });

  it("falls back to routeRequest when queue spec has no characterId", async () => {
    // No spec.characterId — the worker re-routes the request. "make Sol
    // Navarro" must land on the canon header.id `sol-navarro`, not the
    // legacy roleSlug `cno`, because routeRequest goes through the canon
    // identity bridge.
    const runId = randomUUID();
    writeQueueEntry(runId, {
      request: "make Sol Navarro for the Tower",
      sourceSurface: "artlab-mcp",
    });
    const result = await runWorkerSubcommand({
      workspaceRoot,
      args: [runId],
      log: noopLog,
      maxTransitions: 0,
      providerId: "local-mock",
    });
    expect(result.exitCode).toBe(0);
    const state = readRunStateSnapshot(join(workspaceRoot, "runs", runId));
    expect(state).not.toBeNull();
    expect(state!.characterId).toBe("sol-navarro");
  });

  it("treats non-string spec.characterId as missing and falls back to routing", async () => {
    // Defensive: queue-entry.json is just `z.record(z.string(), z.unknown())`
    // so a malformed spec.characterId (number, null, object) shouldn't
    // crash the worker — it should fall through to routeRequest.
    const runId = randomUUID();
    writeQueueEntry(runId, {
      request: "make Sol Navarro",
      characterId: 12345,
      sourceSurface: "artlab-mcp",
    });
    const result = await runWorkerSubcommand({
      workspaceRoot,
      args: [runId],
      log: noopLog,
      maxTransitions: 0,
      providerId: "local-mock",
    });
    expect(result.exitCode).toBe(0);
    const state = readRunStateSnapshot(join(workspaceRoot, "runs", runId));
    expect(state!.characterId).toBe("sol-navarro");
  });

  it("exits 1 when there's no existing state and no queue-entry.json", async () => {
    const runId = randomUUID();
    const result = await runWorkerSubcommand({
      workspaceRoot,
      args: [runId],
      log: noopLog,
      maxTransitions: 0,
      providerId: "local-mock",
    });
    expect(result.exitCode).toBe(1);
    expect(result.runId).toBe(runId);
  });

  it("exits 2 when runId argument is missing", async () => {
    const result = await runWorkerSubcommand({
      workspaceRoot,
      args: [],
      log: noopLog,
      maxTransitions: 0,
      providerId: "local-mock",
    });
    expect(result.exitCode).toBe(2);
  });
});
