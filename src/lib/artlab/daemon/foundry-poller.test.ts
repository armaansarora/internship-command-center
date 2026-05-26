// src/lib/artlab/daemon/foundry-poller.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createFoundryPoller, FoundryGenerateJobSchema } from "./foundry-poller";
import { listQueuedRuns } from "@/lib/artlab/queue/queue";
import { readRunStateSnapshot } from "@/lib/artlab/state/snapshots";

describe("foundry-poller", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-foundry-poller-"));
  });

  function writeInboxJob(payload: Record<string, unknown>): string {
    const dir = join(workspaceRoot, "inbox", "foundry");
    mkdirSync(dir, { recursive: true });
    const runId = (payload.runId as string | undefined) ?? randomUUID();
    const filename = `generate-${runId}.json`;
    writeFileSync(
      join(dir, filename),
      JSON.stringify({
        runId,
        queuedAt: new Date().toISOString(),
        source: "foundry-mcp",
        kind: "character",
        description: "Rafe with a charcoal wool jacket update",
        ...payload,
      }),
    );
    return runId;
  }

  it("schema rejects unknown extra fields (strict mode)", () => {
    expect(() =>
      FoundryGenerateJobSchema.parse({
        runId: "11111111-1111-4111-8111-111111111111",
        queuedAt: "2026-05-25T00:00:00.000Z",
        source: "foundry-mcp",
        kind: "character",
        description: "a long enough description",
        unexpectedField: true,
      }),
    ).toThrow();
  });

  it("returns no work and creates the inbox dir when missing", async () => {
    const poller = createFoundryPoller({ workspaceRoot });
    const out = await poller.tick();
    expect(out.enqueuedRunIds).toEqual([]);
    expect(existsSync(join(workspaceRoot, "inbox", "foundry"))).toBe(true);
  });

  it("drains a foundry inbox job into the queue and archives the file", async () => {
    const runId = writeInboxJob({});
    const poller = createFoundryPoller({ workspaceRoot });
    const out = await poller.tick();

    expect(out.enqueuedRunIds).toEqual([runId]);

    // Queue entry landed.
    const queued = listQueuedRuns(workspaceRoot);
    expect(queued).toHaveLength(1);
    expect(queued[0]!.runId).toBe(runId);
    expect(queued[0]!.priority).toBe("default");
    expect(queued[0]!.spec.sourceSurface).toBe("foundry-mcp");
    expect(queued[0]!.spec.intent).toBe("foundry-generate");

    // run-state.json seeded with phase=routed.
    const state = readRunStateSnapshot(join(workspaceRoot, "runs", runId));
    expect(state).not.toBeNull();
    expect(state!.phase).toBe("routed");
    expect(state!.assetType).toBe("character");
    expect(state!.request).toMatch(/charcoal wool jacket/);

    // Inbox file moved into .processed.
    const inboxDir = join(workspaceRoot, "inbox", "foundry");
    const remaining = readdirSync(inboxDir).filter((f) => f.startsWith("generate-"));
    expect(remaining).toHaveLength(0);
    expect(existsSync(join(inboxDir, ".processed", `${runId}.json`))).toBe(true);
  });

  it("maps high-priority foundry jobs onto the human-flagged queue lane", async () => {
    const runId = writeInboxJob({ priority: "high" });
    const poller = createFoundryPoller({ workspaceRoot });
    await poller.tick();
    const queued = listQueuedRuns(workspaceRoot);
    expect(queued[0]!.runId).toBe(runId);
    expect(queued[0]!.priority).toBe("human-flagged");
  });

  it("maps every FoundryAssetKind onto a valid ArtLabAssetType", async () => {
    const cases: Array<{ kind: string; expected: string }> = [
      { kind: "character", expected: "character" },
      { kind: "floor", expected: "environment" },
      { kind: "ui-texture", expected: "ui-texture" },
      { kind: "icon", expected: "icon-system" },
      { kind: "sprite-animation", expected: "animation" },
      { kind: "lottie", expected: "animation" },
    ];
    for (const c of cases) {
      const runId = writeInboxJob({ kind: c.kind });
      const poller = createFoundryPoller({ workspaceRoot });
      await poller.tick();
      const state = readRunStateSnapshot(join(workspaceRoot, "runs", runId));
      expect(state!.assetType).toBe(c.expected);
    }
  });

  it("quarantines malformed JSON files into .bad without crashing", async () => {
    const inboxDir = join(workspaceRoot, "inbox", "foundry");
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(join(inboxDir, "generate-bad.json"), "{not valid json");
    const poller = createFoundryPoller({ workspaceRoot });
    const out = await poller.tick();
    expect(out.enqueuedRunIds).toEqual([]);
    expect(out.failedFiles).toContain("generate-bad.json");
    // File moved into .bad/.
    const badDir = join(inboxDir, ".bad");
    expect(existsSync(badDir)).toBe(true);
    expect(readdirSync(badDir).some((f) => f.endsWith("-generate-bad.json"))).toBe(true);
    // No queue or run-state side effects.
    expect(listQueuedRuns(workspaceRoot)).toHaveLength(0);
    // Error logged.
    expect(existsSync(join(workspaceRoot, "daemon-errors.jsonl"))).toBe(true);
  });

  it("quarantines schema-invalid payloads (e.g. missing required fields)", async () => {
    const inboxDir = join(workspaceRoot, "inbox", "foundry");
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(
      join(inboxDir, "generate-incomplete.json"),
      JSON.stringify({ source: "foundry-mcp" }),
    );
    const poller = createFoundryPoller({ workspaceRoot });
    const out = await poller.tick();
    expect(out.failedFiles).toContain("generate-incomplete.json");
    expect(readdirSync(join(inboxDir, ".bad"))).toHaveLength(1);
  });

  it("ignores .tmp.<pid>.<ts> half-written files", async () => {
    const inboxDir = join(workspaceRoot, "inbox", "foundry");
    mkdirSync(inboxDir, { recursive: true });
    const runId = randomUUID();
    writeFileSync(
      join(inboxDir, `generate-${runId}.json.tmp.${process.pid}.${Date.now()}`),
      JSON.stringify({ partial: "still-writing" }),
    );
    const poller = createFoundryPoller({ workspaceRoot });
    const out = await poller.tick();
    expect(out.enqueuedRunIds).toEqual([]);
    expect(out.failedFiles).toEqual([]);
    // File untouched.
    const remaining = readdirSync(inboxDir).filter((f) => f.includes(".tmp."));
    expect(remaining).toHaveLength(1);
  });

  it("drains multiple jobs in one tick in stable sorted order", async () => {
    // Use lexicographic ordering of the UUIDs to assert stable order.
    const ids = [
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
    ];
    for (const id of ids) writeInboxJob({ runId: id });
    const poller = createFoundryPoller({ workspaceRoot });
    const out = await poller.tick();
    expect(out.enqueuedRunIds).toEqual(ids);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Brain-hint sidecar handling — see `generate.ts` and Critical Finding 1.
  //
  // The MCP `generate` handler writes brain enrichment to a sidecar file
  // (`generate-<runId>.brain-hint.json`) instead of rewriting the trigger
  // file. The poller is responsible for:
  //   - Merging the sidecar into the job payload before validation.
  //   - Treating sidecars as auxiliary — they are NEVER trigger files.
  //   - Archiving the sidecar alongside the trigger file on success.
  //   - Ignoring orphan sidecars (trigger archived before enrichment).
  // ─────────────────────────────────────────────────────────────────────────
  describe("brain-hint sidecar handling", () => {
    it("merges a brain-hint sidecar into the queued job spec", async () => {
      const runId = "00000000-0000-4000-8000-00000000aaaa";
      writeInboxJob({ runId, brainHintStatus: "pending" });
      // Write the sidecar with a "ready" result.
      const inboxDir = join(workspaceRoot, "inbox", "foundry");
      writeFileSync(
        join(inboxDir, `generate-${runId}.brain-hint.json`),
        JSON.stringify({
          runId,
          brainHintStatus: "ready",
          brainHint: { targetStyle: "satin-lapel" },
          brainHintCompletedAt: new Date().toISOString(),
        }),
      );
      const poller = createFoundryPoller({ workspaceRoot });
      const out = await poller.tick();
      expect(out.enqueuedRunIds).toEqual([runId]);
      const queued = listQueuedRuns(workspaceRoot);
      expect(queued[0]!.spec.brainHintStatus).toBe("ready");
      expect(queued[0]!.spec.brainHint).toEqual({ targetStyle: "satin-lapel" });
      // Sidecar archived alongside the trigger file.
      const processed = join(inboxDir, ".processed");
      expect(existsSync(join(processed, `${runId}.json`))).toBe(true);
      expect(existsSync(join(processed, `${runId}.brain-hint.json`))).toBe(true);
    });

    it("never treats a sidecar as a trigger file (orphan sidecars are ignored)", async () => {
      // Simulate the race: trigger file already archived (so this tick has
      // only a leftover sidecar in the live inbox). The poller must NOT
      // process the sidecar as a new job.
      const orphanRunId = "00000000-0000-4000-8000-00000000bbbb";
      const inboxDir = join(workspaceRoot, "inbox", "foundry");
      mkdirSync(inboxDir, { recursive: true });
      writeFileSync(
        join(inboxDir, `generate-${orphanRunId}.brain-hint.json`),
        JSON.stringify({
          runId: orphanRunId,
          brainHintStatus: "ready",
          brainHint: { targetStyle: "anything" },
          brainHintCompletedAt: new Date().toISOString(),
        }),
      );
      const poller = createFoundryPoller({ workspaceRoot });
      const out = await poller.tick();
      expect(out.enqueuedRunIds).toEqual([]);
      expect(out.failedFiles).toEqual([]);
      // Orphan sidecar still in place, untouched.
      expect(
        existsSync(join(inboxDir, `generate-${orphanRunId}.brain-hint.json`)),
      ).toBe(true);
      // No queue / run-state side effects.
      expect(listQueuedRuns(workspaceRoot)).toHaveLength(0);
      expect(existsSync(join(workspaceRoot, "runs", orphanRunId))).toBe(false);
    });

    it("survives a malformed sidecar — falls back to the trigger file as source of truth", async () => {
      const runId = "00000000-0000-4000-8000-00000000cccc";
      writeInboxJob({ runId });
      const inboxDir = join(workspaceRoot, "inbox", "foundry");
      writeFileSync(
        join(inboxDir, `generate-${runId}.brain-hint.json`),
        "{not valid",
      );
      const poller = createFoundryPoller({ workspaceRoot });
      const out = await poller.tick();
      // Trigger still processed (sidecar parse failure logged, not fatal).
      expect(out.enqueuedRunIds).toEqual([runId]);
      // daemon-errors.jsonl records the sidecar failure for /health.
      const errs = readFileSync(join(workspaceRoot, "daemon-errors.jsonl"), "utf8");
      expect(errs).toMatch(/foundry-poller:sidecar/);
    });
  });
});
