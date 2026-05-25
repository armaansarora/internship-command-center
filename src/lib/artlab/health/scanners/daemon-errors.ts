// src/lib/artlab/health/scanners/daemon-errors.ts
//
// Reads the daemon-errors.jsonl tail to surface recent failures in /health.
// Returns a count of last-24h errors + the most recent error for actionable
// messaging. Tolerates a missing or corrupted file (returns zeros).

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export interface DaemonErrorSample {
  at: string;
  source: string;
  message: string;
}

export interface DaemonErrorsScanResult {
  recent24hCount: number;
  lastError?: DaemonErrorSample;
  heartbeat?: { pid: number; at: string; staleMs: number };
  engineVersion?: string;        // short git sha
  engineVersionAt?: string;      // ISO commit timestamp
}

const HEARTBEAT_STALE_THRESHOLD_MS = 10_000;

export function scanDaemonErrors(workspaceRoot: string, now: () => Date = () => new Date()): DaemonErrorsScanResult {
  const result: DaemonErrorsScanResult = { recent24hCount: 0 };
  // Heartbeat freshness + engine version.
  try {
    const hbPath = join(workspaceRoot, "daemon-heartbeat.json");
    if (existsSync(hbPath)) {
      const parsed = JSON.parse(readFileSync(hbPath, "utf8")) as {
        pid?: number;
        at?: string;
        engineVersion?: string;
        engineVersionAt?: string;
      };
      if (typeof parsed.at === "string" && typeof parsed.pid === "number") {
        const staleMs = now().getTime() - new Date(parsed.at).getTime();
        result.heartbeat = { pid: parsed.pid, at: parsed.at, staleMs };
      }
      if (typeof parsed.engineVersion === "string") result.engineVersion = parsed.engineVersion;
      if (typeof parsed.engineVersionAt === "string") result.engineVersionAt = parsed.engineVersionAt;
    }
  } catch { /* keep result.heartbeat undefined */ }
  // Recent errors.
  const errPath = join(workspaceRoot, "daemon-errors.jsonl");
  if (!existsSync(errPath)) return result;
  // Bound the read: only read the last 256KB so a runaway log doesn't OOM
  // the health scanner.
  try {
    const size = statSync(errPath).size;
    const tailBytes = Math.min(size, 256 * 1024);
    const fd = readFileSync(errPath);
    const tail = fd.subarray(fd.length - tailBytes).toString("utf8");
    const lines = tail.split("\n").filter(Boolean);
    const cutoffMs = now().getTime() - 24 * 60 * 60 * 1000;
    let lastSeen: DaemonErrorSample | undefined;
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as { at?: string; source?: string; message?: string };
        if (!parsed.at) continue;
        const ts = new Date(parsed.at).getTime();
        if (!Number.isFinite(ts) || ts < cutoffMs) continue;
        result.recent24hCount += 1;
        lastSeen = {
          at: parsed.at,
          source: parsed.source ?? "unknown",
          message: (parsed.message ?? "").slice(0, 200),
        };
      } catch { /* skip malformed lines */ }
    }
    if (lastSeen) result.lastError = lastSeen;
  } catch { /* swallow */ }
  return result;
}

export function isHeartbeatStale(staleMs: number | undefined): boolean {
  if (typeof staleMs !== "number") return false;
  return staleMs > HEARTBEAT_STALE_THRESHOLD_MS;
}
