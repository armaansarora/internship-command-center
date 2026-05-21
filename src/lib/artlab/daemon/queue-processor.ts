// src/lib/artlab/daemon/queue-processor.ts
import type { ChildProcess } from "node:child_process";
import { dequeueNextRun, type ArtLabQueueEntry } from "@/lib/artlab/queue/queue";
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

export function createQueueProcessor(input: QueueProcessorInput): QueueProcessor {
  return {
    async tick(): Promise<void> {
      if (!input.supervisor.canSpawn()) return;
      const next = dequeueNextRun(input.workspaceRoot);
      if (!next) return;
      const child = input.spawnRunner(next);
      const registered = input.supervisor.registerChild({ runId: next.runId, pid: child.pid ?? -1 });
      if (!registered.accepted) {
        // Cap won the race — try to kill the just-spawned child to avoid drift.
        child.kill?.("SIGTERM");
        return;
      }
      child.on?.("exit", () => { input.supervisor.releaseChild(next.runId); });
    },
  };
}
