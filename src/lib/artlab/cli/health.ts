// src/lib/artlab/cli/health.ts
//
// `artlab health` — composes the health snapshot, prints the Tower-styled
// health view, and returns a non-zero exit code when the daemon is down or
// lock files look stale (so CI / dashboards can grep `$?`). `--soft`
// suppresses the exit code: useful for non-blocking dashboards that just
// want the rendered view.

import { buildArtLabHealthSnapshot, type ArtLabHealthSnapshot } from "@/lib/artlab/health/snapshot";
import { isHeartbeatStale } from "@/lib/artlab/health/scanners/daemon-errors";
import { renderHealthView } from "./ui/render";

export interface HealthSubcommandInput {
  workspaceRoot: string;
  args: string[];
  log(line: string): void;
}

export interface HealthSubcommandResult { exitCode: number; }

const HEALTH_USAGE =
  "artlab health [--soft]               real engine health report\n" +
  "  --soft                              always exit 0, even when the daemon is down or locks are stale";

/**
 * Returns true when the health snapshot indicates the daemon is not
 * actively writing heartbeats — either no heartbeat file at all, or a
 * heartbeat older than the stale threshold (see isHeartbeatStale).
 */
export function isDaemonDown(snapshot: ArtLabHealthSnapshot): boolean {
  if (!snapshot.daemon.heartbeat) return true;
  return isHeartbeatStale(snapshot.daemon.heartbeat.staleMs);
}

/**
 * Returns true when at least one lock file looks "stale" — its scope is
 * unknown / unparseable, its holder PID is missing, or the lock file
 * itself was malformed (holderPid===0 indicates the locks scanner failed
 * to parse the JSON). The daemon process spawning a worker writes its
 * own .lock with a real PID, so a 0 here means trouble.
 */
export function hasStaleLocks(snapshot: ArtLabHealthSnapshot): boolean {
  for (const lock of snapshot.locks.locks) {
    if (lock.holderPid <= 0) return true;
  }
  return false;
}

export async function runHealthSubcommand(input: HealthSubcommandInput): Promise<HealthSubcommandResult> {
  if (input.args.some((arg) => arg === "--help" || arg === "-h")) {
    input.log(HEALTH_USAGE);
    return { exitCode: 0 };
  }
  const soft = input.args.includes("--soft");
  const snapshot = await buildArtLabHealthSnapshot({ workspaceRoot: input.workspaceRoot });
  input.log(renderHealthView(snapshot));
  if (soft) return { exitCode: 0 };
  if (isDaemonDown(snapshot) || hasStaleLocks(snapshot)) return { exitCode: 1 };
  return { exitCode: 0 };
}
