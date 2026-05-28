// src/lib/artlab/daemon/cli-inbox-consumer.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCliInboxConsumer } from "./cli-inbox-consumer";
import { readRunStateSnapshot, writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import type { ArtLabRunState } from "@/lib/artlab/types";

function seedRun(workspaceRoot: string, runId: string, phase: ArtLabRunState["phase"]): string {
  const runDir = join(workspaceRoot, "runs", runId);
  mkdirSync(runDir, { recursive: true });
  const now = new Date().toISOString();
  const state: ArtLabRunState = {
    runId,
    assetType: "character",
    phase,
    createdAt: now,
    updatedAt: now,
    phaseStartedAt: now,
    request: `Sol fixture — ${phase}`,
  };
  writeRunStateSnapshot(runDir, state);
  writeFileSync(
    join(runDir, "queue-entry.json"),
    JSON.stringify({
      runId,
      priority: "default",
      enqueuedAt: now,
      spec: { sourceSurface: "cli", intent: "produce", request: state.request },
    }, null, 2),
  );
  return runDir;
}

function seedBriefReviewRun(workspaceRoot: string, runId: string): string {
  return seedRun(workspaceRoot, runId, "brief-review");
}

function dropAnswer(runDir: string, runId: string, answer: string): string {
  const cliInbox = join(runDir, "cli-inbox");
  mkdirSync(cliInbox, { recursive: true });
  const path = join(cliInbox, `answer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  writeFileSync(path, JSON.stringify({ kind: "answer", runId, answer, requestedAt: new Date().toISOString() }, null, 2));
  return path;
}

describe("cli inbox consumer", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-consumer-")); });

  it("advances brief-review to generating-concepts when answer is 'approve direction N' and removes the consumed file", async () => {
    const runId = "test-run-brief-approve";
    const runDir = seedBriefReviewRun(workspaceRoot, runId);
    const answerPath = dropAnswer(runDir, runId, "approve direction 2");

    const consumer = createCliInboxConsumer({ workspaceRoot });
    const result = await consumer.drain();

    expect(result.answersProcessed).toBe(1);
    expect(result.advancements).toContainEqual({ runId, from: "brief-review", to: "generating-concepts" });

    const advanced = readRunStateSnapshot(runDir);
    expect(advanced?.phase).toBe("generating-concepts");

    expect(existsSync(answerPath)).toBe(false);

    const events = readFileSync(join(runDir, "events.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const transitions = events.filter((e) => e.kind === "phase-transition");
    expect(transitions.at(-1).payload).toMatchObject({ from: "brief-review", to: "generating-concepts" });
  });

  it("advances concept-review to canary on 'approve direction N' and records the approved lane", async () => {
    const runId = "test-run-concept-approve";
    const runDir = seedRun(workspaceRoot, runId, "concept-review");
    dropAnswer(runDir, runId, "approve direction 3");

    const result = await createCliInboxConsumer({ workspaceRoot }).drain();

    expect(result.advancements).toContainEqual({ runId, from: "concept-review", to: "canary" });
    const advanced = readRunStateSnapshot(runDir);
    expect(advanced?.phase).toBe("canary");
    expect(advanced?.approvedConcept?.laneIndex).toBe(3);
  });

  it("advances final-review to promoting on the exact phrase 'approved for app'", async () => {
    const runId = "test-run-final-approve";
    const runDir = seedRun(workspaceRoot, runId, "final-review");
    dropAnswer(runDir, runId, "approved for app");

    const result = await createCliInboxConsumer({ workspaceRoot }).drain();

    expect(result.advancements).toContainEqual({ runId, from: "final-review", to: "promoting" });
    const advanced = readRunStateSnapshot(runDir);
    expect(advanced?.phase).toBe("promoting");
    expect(existsSync(join(runDir, "approval.json"))).toBe(true);
  });
});
