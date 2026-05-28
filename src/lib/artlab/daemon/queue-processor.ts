// src/lib/artlab/daemon/queue-processor.ts
import type { ChildProcess } from "node:child_process";
import {
  dequeueNextRun,
  releaseInflight,
  requeueInflight,
  type ArtLabQueueEntry,
} from "@/lib/artlab/queue/queue";
import type { Supervisor } from "./supervisor";

export interface QueueProcessorChild {
  pid: number;
  on(event: "exit", handler: (code: number) => void): void;
  kill(signal?: NodeJS.Signals): boolean;
}

export interface QueueProcessorInput {
  workspaceRoot: string;
  supervisor: Supervisor;
  spawnRunner(entry: ArtLabQueueEntry): QueueProcessorChild | ChildProcess;
}

export interface QueueProcessor {
  tick(): Promise<void>;
}

/**
 * Per-tick: claim the next queued run by RENAMING it into inflight/,
 * spawn the worker, then register with the supervisor. The inflight file
 * is the atomic transaction boundary:
 *
 *   - spawn succeeds + registration succeeds → releaseInflight (unlink)
 *   - spawn throws                           → requeueInflight (rename back)
 *   - spawn ok but registration rejects      → kill child + requeueInflight
 *
 * Without this pattern the queue file was unlinked BEFORE the spawn, so any
 * spawn throw silently dropped the job.
 */
export function createQueueProcessor(input: QueueProcessorInput): QueueProcessor {
  return {
    async tick(): Promise<void> {
      if (!input.supervisor.canSpawn()) return;
      const next = dequeueNextRun(input.workspaceRoot);
      if (!next) return;

      let child: QueueProcessorChild | ChildProcess;
      try {
        child = input.spawnRunner(next);
      } catch {
        // Spawn failed before the child existed — put the job back so the
        // next tick can retry. Without this, the inflight file would be
        // orphaned and the run silently dropped.
        requeueInflight(input.workspaceRoot, next.runId);
        return;
      }

      const registered = input.supervisor.registerChild({ runId: next.runId, pid: child.pid ?? -1 });
      if (!registered.accepted) {
        // Cap won the race — try to kill the just-spawned child to avoid
        // drift, and put the job back on the queue.
        child.kill?.("SIGTERM");
        requeueInflight(input.workspaceRoot, next.runId);
        return;
      }
      // Supervisor accepted: the child is now the owner of this run.
      // Release the inflight file so it doesn't leak.
      releaseInflight(input.workspaceRoot, next.runId);
      child.on?.("exit", () => { input.supervisor.releaseChild(next.runId); });
    },
  };
}
