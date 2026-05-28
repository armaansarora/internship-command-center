// src/lib/artlab/cli/run-worker.ts
//
// Hidden subcommand invoked by the daemon's queue processor as a child
// process. Initializes a run's state from its queue-entry.json if needed,
// then walks the deterministic state machine until the run reaches a
// terminal state, a human gate, or a blocker. Exits when no further
// transition can be applied.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readRunStateSnapshot, writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { appendArtLabEvent } from "@/lib/artlab/state/events";
import { runDeterministicTransition } from "@/lib/artlab/orchestrator/deterministic";
import { routeRequest } from "@/lib/artlab/intake/router";
import type { ArtLabRunState } from "@/lib/artlab/types";

export interface RunWorkerInput {
  workspaceRoot: string;
  args: string[];
  log(line: string): void;
  maxTransitions?: number;
  providerId?: "gemini-api" | "local-mock";
}

export interface RunWorkerResult {
  exitCode: number;
  runId?: string;
  finalPhase?: string;
  transitionsApplied?: number;
}

export async function runWorkerSubcommand(input: RunWorkerInput): Promise<RunWorkerResult> {
  const runId = input.args[0];
  if (!runId) {
    input.log("run-worker: expected <runId>");
    return { exitCode: 2 };
  }
  const runDir = join(input.workspaceRoot, "runs", runId);
  if (!existsSync(runDir)) mkdirSync(runDir, { recursive: true });

  let state = readRunStateSnapshot(runDir);
  if (!state) {
    const queueEntryPath = join(runDir, "queue-entry.json");
    if (!existsSync(queueEntryPath)) {
      input.log(`run-worker: no state and no queue-entry.json at ${queueEntryPath}`);
      return { exitCode: 1, runId };
    }
    const entry = JSON.parse(readFileSync(queueEntryPath, "utf8")) as {
      spec?: { request?: unknown; characterId?: unknown };
    };
    const request = typeof entry.spec?.request === "string" ? entry.spec.request : "";
    const outcome = routeRequest({ request });
    // Prefer the queue spec's characterId when present — the enqueuer
    // (bot-dispatcher / sdk-poller) already resolved canon at enqueue time,
    // and re-routing the description here is at best wasted work and at
    // worst a divergence vector if intake heuristics evolved between
    // enqueue and dequeue. Fall back to outcome.characterId only when the
    // spec didn't carry one.
    const specCharacterId = typeof entry.spec?.characterId === "string"
      ? entry.spec.characterId
      : undefined;
    const characterId = specCharacterId ?? outcome.characterId;
    state = {
      runId,
      assetType: outcome.assetType,
      ...(characterId ? { characterId } : {}),
      phase: "routed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      request,
    } satisfies ArtLabRunState;
    writeRunStateSnapshot(runDir, state);
    appendArtLabEvent(runDir, {
      runId,
      at: new Date().toISOString(),
      kind: "routed",
      payload: {
        assetType: outcome.assetType,
        ...(characterId ? { characterId } : {}),
        reasonCodes: outcome.reasonCodes,
      },
    });
  }

  const providerId = input.providerId ?? (process.env.ARTLAB_PROVIDER_ID === "gemini-api" ? "gemini-api" : "local-mock");
  const max = input.maxTransitions ?? 60;
  let applied = 0;
  for (let i = 0; i < max; i += 1) {
    const outcome = await runDeterministicTransition({ runDir, providerId });
    if (!outcome.applied) break;
    applied += 1;
  }

  const finalState = readRunStateSnapshot(runDir);
  input.log(`run-worker ${runId}: phase=${finalState?.phase ?? "unknown"} transitions=${applied}`);
  return { exitCode: 0, runId, finalPhase: finalState?.phase, transitionsApplied: applied };
}
