import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { enqueueRun, listQueuedRuns, dequeueNextRun, ARTLAB_MAX_PARALLELISM } from "./queue";

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

  it("dequeueNextRun returns highest priority and removes it", () => {
    enqueueRun(dir, { runId: "r1", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "a" } });
    enqueueRun(dir, { runId: "r2", priority: "human-flagged", enqueuedAt: "2026-05-20T00:00:01Z", spec: { request: "b" } });
    const first = dequeueNextRun(dir);
    expect(first?.runId).toBe("r2");
    const remaining = listQueuedRuns(dir);
    expect(remaining.map((q) => q.runId)).toEqual(["r1"]);
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
