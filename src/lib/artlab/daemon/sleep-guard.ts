// src/lib/artlab/daemon/sleep-guard.ts
import type { ChildProcess } from "node:child_process";
import { spawn as defaultSpawn } from "node:child_process";

export interface SleepGuardChild {
  pid: number;
  kill(signal?: NodeJS.Signals): boolean;
}

export interface SleepGuardInput {
  spawn?: (cmd: string, args: string[], opts?: Record<string, unknown>) => SleepGuardChild | ChildProcess;
}

export interface SleepGuard {
  activate(): void;
  deactivate(): void;
  isActive(): boolean;
}

export function createSleepGuard(input: SleepGuardInput = {}): SleepGuard {
  const spawnFn = input.spawn ?? defaultSpawn;
  let child: SleepGuardChild | null = null;
  return {
    activate(): void {
      if (child) return;
      child = spawnFn("caffeinate", ["-i"], { stdio: "ignore", detached: false }) as SleepGuardChild;
    },
    deactivate(): void {
      if (!child) return;
      child.kill("SIGTERM");
      child = null;
    },
    isActive(): boolean { return child !== null; },
  };
}
