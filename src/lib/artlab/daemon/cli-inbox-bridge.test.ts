// src/lib/artlab/daemon/cli-inbox-bridge.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCliInboxBridge } from "./cli-inbox-bridge";
import { listQueuedRuns } from "@/lib/artlab/queue/queue";

describe("cli inbox bridge", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-bridge-")); });

  it("drains produce intents into the queue and removes the inbox files", async () => {
    const inboxDir = join(workspaceRoot, "inbox", "cli");
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(join(inboxDir, "produce-aaa.json"), JSON.stringify({ request: "make a hero", sourceSurface: "cli" }));
    writeFileSync(join(inboxDir, "produce-bbb.json"), JSON.stringify({ request: "another", sourceSurface: "cli" }));
    const bridge = createCliInboxBridge({ workspaceRoot });
    const result = await bridge.drain();
    expect(result.enqueuedRunIds).toHaveLength(2);
    const queued = listQueuedRuns(workspaceRoot);
    expect(queued).toHaveLength(2);
    expect(queued.every((q) => q.spec.intent === "produce")).toBe(true);
    expect(readdirSync(inboxDir)).toHaveLength(0);
  });

  it("ignores produce intents with empty request bodies", async () => {
    const inboxDir = join(workspaceRoot, "inbox", "cli");
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(join(inboxDir, "produce-empty.json"), JSON.stringify({ request: "" }));
    const bridge = createCliInboxBridge({ workspaceRoot });
    const result = await bridge.drain();
    expect(result.enqueuedRunIds).toHaveLength(0);
    expect(listQueuedRuns(workspaceRoot)).toHaveLength(0);
  });

  it("routes continue intents into the matching run's cli-inbox", async () => {
    mkdirSync(join(workspaceRoot, "runs", "run-x"), { recursive: true });
    const inboxDir = join(workspaceRoot, "inbox", "cli");
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(join(inboxDir, "continue-run-x-1.json"), JSON.stringify({ runId: "run-x", intent: "continue" }));
    const bridge = createCliInboxBridge({ workspaceRoot });
    const result = await bridge.drain();
    expect(result.continueIntents).toBe(1);
    const runCliInbox = join(workspaceRoot, "runs", "run-x", "cli-inbox");
    expect(existsSync(runCliInbox)).toBe(true);
    const files = readdirSync(runCliInbox);
    expect(files.some((f) => f.startsWith("continue-"))).toBe(true);
  });

  it("routes answer intents into the matching run's cli-inbox", async () => {
    mkdirSync(join(workspaceRoot, "runs", "run-y"), { recursive: true });
    const inboxDir = join(workspaceRoot, "inbox", "cli");
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(join(inboxDir, "answer-run-y-1.json"), JSON.stringify({ runId: "run-y", intent: "answer", answer: "ship lane 2" }));
    const bridge = createCliInboxBridge({ workspaceRoot });
    const result = await bridge.drain();
    expect(result.answerIntents).toBe(1);
    const runCliInbox = join(workspaceRoot, "runs", "run-y", "cli-inbox");
    const files = readdirSync(runCliInbox);
    expect(files.some((f) => f.startsWith("answer-"))).toBe(true);
  });

  it("drops continue/answer intents whose target run does not exist (no crash, no orphan file)", async () => {
    const inboxDir = join(workspaceRoot, "inbox", "cli");
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(join(inboxDir, "continue-missing-1.json"), JSON.stringify({ runId: "missing" }));
    const bridge = createCliInboxBridge({ workspaceRoot });
    const result = await bridge.drain();
    expect(result.continueIntents).toBe(1); // counted but not landed
    expect(existsSync(join(workspaceRoot, "runs", "missing"))).toBe(false);
  });
});
