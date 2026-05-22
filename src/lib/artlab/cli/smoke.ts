// src/lib/artlab/cli/smoke.ts
//
// Free end-to-end mock-mode smoke test for ArtLab. Drives a synthetic
// "produce" intent from CLI inbox → queue bridge → in-process worker →
// promotion. Costs $0. Used to verify that the engine's wiring is intact:
// if any step is a stub (as the daemon was before the recent fixes), this
// test fails fast.

import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runProduceSubcommand } from "./produce";
import { createCliInboxBridge } from "@/lib/artlab/daemon/cli-inbox-bridge";
import { dequeueNextRun, listQueuedRuns } from "@/lib/artlab/queue/queue";
import { runWorkerSubcommand } from "./run-worker";
import { readRunStateSnapshot, writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { banner, gold, header, highlight, kvList, muted, step, summaryFooter, type KvRow } from "./ui/widgets";
import { box } from "./ui/box";

export interface SmokeInput {
  log(line: string): void;
  err(line: string): void;
}

export interface SmokeResult {
  exitCode: number;
  finalPhase?: string;
  workspaceRoot?: string;
  receiptPath?: string;
}

function originalProviderEnv(): { mode?: string; gemini?: string; claude?: string; codex?: string } {
  return {
    mode: process.env.ARTLAB_PROVIDER_ID,
    gemini: process.env.ARTLAB_GEMINI_MODE,
    claude: process.env.ARTLAB_CLAUDE_MODE,
    codex: process.env.ARTLAB_CODEX_MODE,
  };
}

function restoreEnv(snap: ReturnType<typeof originalProviderEnv>): void {
  if (snap.mode === undefined) delete process.env.ARTLAB_PROVIDER_ID; else process.env.ARTLAB_PROVIDER_ID = snap.mode;
  if (snap.gemini === undefined) delete process.env.ARTLAB_GEMINI_MODE; else process.env.ARTLAB_GEMINI_MODE = snap.gemini;
  if (snap.claude === undefined) delete process.env.ARTLAB_CLAUDE_MODE; else process.env.ARTLAB_CLAUDE_MODE = snap.claude;
  if (snap.codex === undefined) delete process.env.ARTLAB_CODEX_MODE; else process.env.ARTLAB_CODEX_MODE = snap.codex;
}

const STEPS = [
  "CLI 'produce' writes an intent to inbox/cli/",
  "Daemon drains the inbox and enqueues the run",
  "Queue processor dequeues; worker walks routed → concept-review",
  "Simulate Human Gate 1: 'approve direction 1' (concept-review → canary)",
  "Worker walks canary → final-review",
  "Simulate Human Gate 2: 'approved for app' (final-review → promoting → closed)",
];

function emitStepDone(log: (line: string) => void, idx: number) {
  log(step({ step: idx, total: STEPS.length, label: STEPS[idx - 1]!, state: "done" }));
}

function emitStepRunning(log: (line: string) => void, idx: number) {
  log(step({ step: idx, total: STEPS.length, label: STEPS[idx - 1]!, state: "running" }));
}

export async function runSmokeSubcommand(input: SmokeInput): Promise<SmokeResult> {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-smoke-"));
  const publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-smoke-public-"));
  const envSnap = originalProviderEnv();
  process.env.ARTLAB_PROVIDER_ID = "local-mock";
  process.env.ARTLAB_GEMINI_MODE = "mock";
  process.env.ARTLAB_CLAUDE_MODE = "dry-run";
  process.env.ARTLAB_CODEX_MODE = "mock";
  process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
  process.env.ARTLAB_WORKSPACE_ROOT = workspaceRoot;

  const log = (line: string) => input.log(line);
  const err = (line: string) => input.err(line);

  try {
    input.log(banner({ subtitle: "Free end-to-end mock smoke test" }));
    input.log("");
    input.log(header("Smoke test", `${STEPS.length} steps · $0 cost · mock providers`));
    input.log("");

    const envRows: KvRow[] = [
      { label: "workspace", value: workspaceRoot },
      { label: "public-art", value: publicArtRoot },
      { label: "provider", value: "local-mock", status: "info" },
      { label: "gemini", value: "mock", status: "info" },
      { label: "claude", value: "dry-run", status: "info" },
      { label: "codex", value: "mock", status: "info" },
    ];
    input.log(box([kvList(envRows)], { title: "Environment" }));
    input.log("");

    emitStepRunning(log, 1);
    const produce = await runProduceSubcommand({ workspaceRoot, args: ["lobby with Otis in it"] });
    if (produce.exitCode !== 0) {
      err(summaryFooter({ label: `produce failed: ${produce.message ?? "unknown"}`, state: "fail" }));
      return { exitCode: 1, workspaceRoot };
    }
    emitStepDone(log, 1);

    emitStepRunning(log, 2);
    const bridge = createCliInboxBridge({ workspaceRoot });
    const drainResult = await bridge.drain();
    if (drainResult.enqueuedRunIds.length === 0) {
      err(summaryFooter({ label: "bridge did not enqueue anything — CLI ↔ queue is broken", state: "fail" }));
      return { exitCode: 1, workspaceRoot };
    }
    const runId = drainResult.enqueuedRunIds[0]!;
    input.log(muted(`         enqueued runId=${runId}`));
    emitStepDone(log, 2);

    emitStepRunning(log, 3);
    const entry = dequeueNextRun(workspaceRoot);
    if (!entry || entry.runId !== runId) {
      err(summaryFooter({ label: `dequeue mismatch: got ${entry?.runId ?? "null"}`, state: "fail" }));
      return { exitCode: 1, workspaceRoot };
    }
    const runDir = join(workspaceRoot, "runs", runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, "queue-entry.json"), JSON.stringify(entry, null, 2));
    const firstWalk = await runWorkerSubcommand({
      workspaceRoot, args: [runId], log: () => {},
      providerId: "local-mock", maxTransitions: 40,
    });
    if (firstWalk.exitCode !== 0) {
      err(summaryFooter({ label: `first walker exit=${firstWalk.exitCode}`, state: "fail" }));
      return { exitCode: 1, workspaceRoot };
    }
    const afterFirstWalk = readRunStateSnapshot(runDir);
    input.log(muted(`         phase after walk: ${highlight(afterFirstWalk?.phase ?? "?")}`));
    emitStepDone(log, 3);

    emitStepRunning(log, 4);
    if (afterFirstWalk?.phase === "concept-review") {
      writeRunStateSnapshot(runDir, {
        ...afterFirstWalk,
        phase: "canary",
        approvedConcept: { laneIndex: 1, approvedAt: new Date().toISOString(), approvedBy: "human" },
        updatedAt: new Date().toISOString(),
      });
    }
    const cutoutsDir = join(runDir, "cutouts");
    if (!existsSync(cutoutsDir)) mkdirSync(cutoutsDir, { recursive: true });
    writeFileSync(join(cutoutsDir, "slot-1.png"), JSON.stringify({ alpha: true }));
    emitStepDone(log, 4);

    emitStepRunning(log, 5);
    const secondWalk = await runWorkerSubcommand({
      workspaceRoot, args: [runId], log: () => {},
      providerId: "local-mock", maxTransitions: 40,
    });
    if (secondWalk.exitCode !== 0) {
      err(summaryFooter({ label: `second walker exit=${secondWalk.exitCode}`, state: "fail" }));
      return { exitCode: 1, workspaceRoot };
    }
    const afterSecondWalk = readRunStateSnapshot(runDir);
    input.log(muted(`         phase after walk: ${highlight(afterSecondWalk?.phase ?? "?")}`));
    emitStepDone(log, 5);

    emitStepRunning(log, 6);
    if (afterSecondWalk?.phase === "final-review") {
      writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
      writeRunStateSnapshot(runDir, {
        ...afterSecondWalk,
        phase: "promoting",
        updatedAt: new Date().toISOString(),
      });
    }
    const thirdWalk = await runWorkerSubcommand({
      workspaceRoot, args: [runId], log: () => {},
      providerId: "local-mock", maxTransitions: 40,
    });
    if (thirdWalk.exitCode !== 0) {
      err(summaryFooter({ label: `third walker exit=${thirdWalk.exitCode}`, state: "fail" }));
      return { exitCode: 1, workspaceRoot };
    }
    emitStepDone(log, 6);
    const finalState = readRunStateSnapshot(runDir);
    const receiptPath = join(runDir, "promotion-receipt.json");
    const remainingQueued = listQueuedRuns(workspaceRoot);
    const publicArtPromoted = existsSync(join(publicArtRoot, "lobby")) ? readdirSync(join(publicArtRoot, "lobby")) : [];
    const memoryDir = join(workspaceRoot, "memory");
    const styleWins = existsSync(join(memoryDir, "style-wins.jsonl"))
      ? readFileSync(join(memoryDir, "style-wins.jsonl"), "utf8").trim().split("\n")
      : [];

    input.log("");

    const resultRows: KvRow[] = [
      { label: "final phase", value: finalState?.phase ?? "unknown", status: finalState?.phase === "closed" ? "ok" : "fail" },
      { label: "blocker", value: finalState?.blocker ?? "(none)", status: finalState?.blocker ? "warn" : "ok" },
      { label: "promotion receipt", value: existsSync(receiptPath) ? "written" : "missing", status: existsSync(receiptPath) ? "ok" : "fail" },
      { label: "queue remainder", value: String(remainingQueued.length), status: remainingQueued.length === 0 ? "ok" : "warn" },
      { label: "public-art lobby", value: publicArtPromoted.join(", ") || "(empty)", status: publicArtPromoted.length > 0 ? "ok" : "fail" },
      { label: "style-wins ledger", value: `${styleWins.length} entr${styleWins.length === 1 ? "y" : "ies"}`, status: styleWins.length > 0 ? "ok" : "warn" },
    ];
    input.log(box([kvList(resultRows)], { title: "Smoke result" }));
    input.log("");

    const ok = finalState?.phase === "closed" && existsSync(receiptPath);
    if (!ok) {
      input.log(summaryFooter({
        label: "Engine wiring is incomplete — see smoke result above.",
        state: "fail",
        notes: [`finalPhase=${finalState?.phase ?? "?"}`, `receipt=${existsSync(receiptPath) ? "yes" : "no"}`],
      }));
      return { exitCode: 1, workspaceRoot, finalPhase: finalState?.phase, receiptPath };
    }
    input.log(summaryFooter({
      label: "Engine wired end-to-end: intake → queue → walker → promotion → memory.",
      state: "ok",
      notes: ["No real-money providers invoked.", `Cost: ${gold("$0.00")}`],
    }));
    return { exitCode: 0, finalPhase: finalState?.phase, workspaceRoot, receiptPath };
  } finally {
    restoreEnv(envSnap);
    delete process.env.ARTLAB_PUBLIC_ART_ROOT;
    delete process.env.ARTLAB_WORKSPACE_ROOT;
  }
}
