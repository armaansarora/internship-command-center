import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ARTLAB_MAX_PARALLELISM,
  dequeueNextRun,
  enqueueRun,
  inflightCount,
  listQueuedRuns,
  releaseInflight,
  requeueInflight,
} from "./queue";

describe("artlab queue", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-queue-")); });

  it("ARTLAB_MAX_PARALLELISM equals 2", () => {
    expect(ARTLAB_MAX_PARALLELISM).toBe(2);
  });

  it("enqueues and lists in priority order", () => {
    enqueueRun(dir, { runId: "r1", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "a" } });
    enqueueRun(dir, { runId: "r2", priority: "human-flagged", enqueuedAt: "2026-05-20T00:00:01Z", spec: { request: "b" } });
    enqueueRun(dir, { runId: "r3", priority: "scheduled", enqueuedAt: "2026-05-20T00:00:02Z", spec: { request: "c" } });
    const list = listQueuedRuns(dir);
    expect(list.map((q) => q.runId)).toEqual(["r2", "r3", "r1"]);
  });

  it("dequeueNextRun returns highest priority and moves it into inflight/", () => {
    enqueueRun(dir, { runId: "r1", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "a" } });
    enqueueRun(dir, { runId: "r2", priority: "human-flagged", enqueuedAt: "2026-05-20T00:00:01Z", spec: { request: "b" } });
    const first = dequeueNextRun(dir);
    expect(first?.runId).toBe("r2");
    const remaining = listQueuedRuns(dir);
    expect(remaining.map((q) => q.runId)).toEqual(["r1"]);
    // The dequeued entry now lives in inflight/ until releaseInflight or
    // requeueInflight resolves it.
    expect(inflightCount(dir)).toBe(1);
    expect(existsSync(join(dir, "queue", "inflight", "r2.json"))).toBe(true);
    // The inflight entry must NOT show up in listQueuedRuns (it has been
    // claimed by the supervisor, no longer schedulable).
    expect(remaining.find((q) => q.runId === "r2")).toBeUndefined();
  });

  it("releaseInflight removes the inflight entry after a successful spawn", () => {
    enqueueRun(dir, { runId: "r-claim", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    const claimed = dequeueNextRun(dir);
    expect(claimed?.runId).toBe("r-claim");
    expect(inflightCount(dir)).toBe(1);
    releaseInflight(dir, "r-claim");
    expect(inflightCount(dir)).toBe(0);
    expect(existsSync(join(dir, "queue", "inflight", "r-claim.json"))).toBe(false);
  });

  it("requeueInflight renames the entry back into the queue on spawn failure", () => {
    enqueueRun(dir, { runId: "r-fail", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    const claimed = dequeueNextRun(dir);
    expect(claimed?.runId).toBe("r-fail");
    expect(listQueuedRuns(dir)).toHaveLength(0);
    const requeued = requeueInflight(dir, "r-fail");
    expect(requeued).toBe(true);
    expect(inflightCount(dir)).toBe(0);
    expect(listQueuedRuns(dir).map((q) => q.runId)).toEqual(["r-fail"]);
  });

  it("listQueuedRuns ignores entries inside inflight/ and .bad/", () => {
    enqueueRun(dir, { runId: "r-real", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    // Inflight should be invisible to listQueuedRuns.
    mkdirSync(join(dir, "queue", "inflight"), { recursive: true });
    writeFileSync(
      join(dir, "queue", "inflight", "r-busy.json"),
      JSON.stringify({ runId: "r-busy", priority: "default", enqueuedAt: "2026-05-20T00:00:01Z", spec: { request: "y" } }),
    );
    const list = listQueuedRuns(dir);
    expect(list.map((q) => q.runId)).toEqual(["r-real"]);
  });

  it("quarantines corrupted queue entries into .bad/ instead of throwing", () => {
    enqueueRun(dir, { runId: "r-good", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "a" } });
    // Drop a malformed JSON file in the queue dir.
    writeFileSync(join(dir, "queue", "r-bad.json"), "not valid json");
    // Drop a JSON-valid but schema-invalid entry.
    writeFileSync(join(dir, "queue", "r-schema.json"), JSON.stringify({ noFields: true }));
    const list = listQueuedRuns(dir);
    expect(list.map((q) => q.runId)).toEqual(["r-good"]);
    // Bad entries should have been moved to .bad/
    const badDir = join(dir, "queue", ".bad");
    expect(existsSync(badDir)).toBe(true);
    const quarantined = readdirSync(badDir);
    expect(quarantined.length).toBe(2);
  });
});
