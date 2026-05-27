// src/lib/artlab/daemon/daemon-lock.ts
//
// Single-instance lock for the ArtLab daemon. Codex's round-2 review surfaced
// that launchd can respawn the daemon while the old process is still draining
// (common during crash recovery), so two daemons end up racing on the same
// `.artlab/engine/inbox/sdk/` directory. The poller's `wx`-mode queue
// writes catch the conflict but the symptom is silently duplicated work in
// `daemon-errors.jsonl` rather than a clean refusal.
//
// Mechanism: atomic `fs.open(path, "wx")` creates `.lock.daemon.json` with
// the current PID — the call fails with EEXIST if any file exists at that
// path, so two daemons can never both think they own the lock. On startup,
// if the lock already exists, we read the PID and check via `process.kill(pid, 0)`
// whether the holder is still alive. A dead holder means a previous daemon
// crashed without cleaning up; we reclaim the lock. A live holder means a
// real conflict — we refuse to start.

import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { join } from "node:path";

const LOCK_FILENAME = ".lock.daemon.json";

export interface DaemonLockHandle {
  /** Absolute path of the lock file on disk. */
  readonly lockPath: string;
  /** PID recorded inside the lock file (matches `process.pid` at acquisition time). */
  readonly pid: number;
  /** Releases the lock — safe to call multiple times. */
  release(): void;
}

export interface AcquireDaemonLockInput {
  /** Workspace root that contains the lock file (`.artlab/engine` in production). */
  workspaceRoot: string;
  /** Override for tests — defaults to `process.pid`. */
  pid?: number;
  /**
   * Override for tests — given a PID, return whether the process is alive.
   * Defaults to a `process.kill(pid, 0)` probe.
   */
  isProcessAlive?: (pid: number) => boolean;
}

export class DaemonAlreadyRunningError extends Error {
  readonly holderPid: number;
  readonly lockPath: string;
  constructor(holderPid: number, lockPath: string) {
    super(
      `artlab daemon already running: ${lockPath} held by pid ${holderPid}; refusing to start a second instance`,
    );
    this.name = "DaemonAlreadyRunningError";
    this.holderPid = holderPid;
    this.lockPath = lockPath;
  }
}

function defaultIsProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    // ESRCH = no such process; EPERM = process exists but we can't signal it.
    if (code === "EPERM") return true;
    return false;
  }
}

/**
 * Atomically acquires the single-instance daemon lock. Throws
 * `DaemonAlreadyRunningError` if another live daemon already holds it.
 * Stale locks (PID no longer alive) are reclaimed silently.
 */
export function acquireDaemonLock(input: AcquireDaemonLockInput): DaemonLockHandle {
  const lockPath = join(input.workspaceRoot, LOCK_FILENAME);
  const pid = input.pid ?? process.pid;
  const isAlive = input.isProcessAlive ?? defaultIsProcessAlive;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(lockPath, "wx");
      const payload = JSON.stringify({ pid, scope: "daemon", acquiredAt: new Date().toISOString() });
      writeSync(fd, payload);
      closeSync(fd);
      let released = false;
      return {
        lockPath,
        pid,
        release(): void {
          if (released) return;
          released = true;
          try {
            unlinkSync(lockPath);
          } catch {
            // Lock file already gone (manual cleanup, etc.) — nothing to do.
          }
        },
      };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw err;
      // Lock exists — check if holder is alive.
      let holderPid = 0;
      try {
        const raw = readFileSync(lockPath, "utf8");
        const parsed = JSON.parse(raw) as { pid?: number };
        holderPid = typeof parsed.pid === "number" ? parsed.pid : 0;
      } catch {
        // Corrupt lock — treat as stale.
      }
      if (holderPid > 0 && isAlive(holderPid)) {
        throw new DaemonAlreadyRunningError(holderPid, lockPath);
      }
      // Stale lock — remove and retry once.
      try {
        unlinkSync(lockPath);
      } catch {
        // Race with another reclaimer is fine — next `wx` open either succeeds
        // (we win) or throws EEXIST again (someone else won; we refuse on the
        // next iteration).
      }
    }
  }

  throw new Error(`artlab daemon: failed to acquire lock at ${lockPath} after stale-reclaim retry`);
}
