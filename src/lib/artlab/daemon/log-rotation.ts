// src/lib/artlab/daemon/log-rotation.ts
//
// Rotates the unbounded log files the daemon writes:
//   • <workspace>/daemon-errors.jsonl
//   • <workspace>/runs/<runId>/worker.out.log
//   • <workspace>/runs/<runId>/worker.err.log
//
// Rotation policy: when a file exceeds MAX_BYTES, move it to `<file>.1`,
// shifting `.1 → .2 → .3` and dropping `.3` if present (keeps last 3
// rotations). Safe to call every daemon tick — it's a no-op when files
// are under the cap.

import { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const MAX_BYTES = 1_000_000; // 1MB per file
const MAX_KEEP = 3;

export interface LogRotationResult {
  rotated: string[];
}

export function rotateDaemonLogs(workspaceRoot: string): LogRotationResult {
  if (!existsSync(workspaceRoot)) mkdirSync(workspaceRoot, { recursive: true });
  const rotated: string[] = [];
  // Top-level daemon logs.
  for (const rel of ["daemon-errors.jsonl"]) {
    const p = join(workspaceRoot, rel);
    if (rotateOne(p)) rotated.push(p);
  }
  // Memory ledgers — decision-log is the noisy one (every brain call writes
  // an entry); style-wins + rejections are smaller but should still rotate
  // for forward safety.
  const memoryDir = join(workspaceRoot, "memory");
  if (existsSync(memoryDir)) {
    for (const rel of ["decision-log.jsonl", "style-wins.jsonl", "style-rejections.jsonl"]) {
      const p = join(memoryDir, rel);
      if (rotateOne(p)) rotated.push(p);
    }
  }
  // Per-run worker logs.
  const runsDir = join(workspaceRoot, "runs");
  if (existsSync(runsDir)) {
    for (const runId of readdirSync(runsDir)) {
      const runDir = join(runsDir, runId);
      try { if (!statSync(runDir).isDirectory()) continue; } catch { continue; }
      for (const name of ["worker.out.log", "worker.err.log"]) {
        const p = join(runDir, name);
        if (rotateOne(p)) rotated.push(p);
      }
    }
  }
  return { rotated };
}

function rotateOne(path: string): boolean {
  if (!existsSync(path)) return false;
  let size = 0;
  try { size = statSync(path).size; } catch { return false; }
  if (size < MAX_BYTES) return false;
  // Shift .2 → .3, .1 → .2, drop .3 if it exists.
  const top = `${path}.${MAX_KEEP}`;
  if (existsSync(top)) {
    try { unlinkSync(top); } catch { /* ignore */ }
  }
  for (let i = MAX_KEEP - 1; i >= 1; i -= 1) {
    const src = `${path}.${i}`;
    const dst = `${path}.${i + 1}`;
    if (existsSync(src)) {
      try { renameSync(src, dst); } catch { /* ignore */ }
    }
  }
  try { renameSync(path, `${path}.1`); return true; }
  catch { return false; }
}
