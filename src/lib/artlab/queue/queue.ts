import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { priorityRank, ARTLAB_PRIORITIES } from "./priorities";

export const ARTLAB_MAX_PARALLELISM = 2;

export const ArtLabQueueEntrySchema = z
  .object({
    runId: z.string().min(1),
    priority: z.enum(ARTLAB_PRIORITIES),
    enqueuedAt: z.string().min(1),
    spec: z.record(z.string(), z.unknown()),
  })
  .strict();
export type ArtLabQueueEntry = z.infer<typeof ArtLabQueueEntrySchema>;

function queueDir(root: string): string {
  const path = join(root, "queue");
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  return path;
}

function inflightDir(root: string): string {
  const path = join(queueDir(root), "inflight");
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  return path;
}

function badDir(root: string): string {
  const path = join(queueDir(root), ".bad");
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  return path;
}

export function enqueueRun(root: string, entry: ArtLabQueueEntry): void {
  ArtLabQueueEntrySchema.parse(entry);
  const path = join(queueDir(root), `${entry.runId}.json`);
  writeFileSync(path, JSON.stringify(entry), { flag: "wx" });
}

/**
 * Read all queue entries. Corrupted JSON files (truncated mid-write, bad
 * schema) are moved to `<queue>/.bad/` with a timestamped name so the
 * processor doesn't keep tripping over them — and the operator can still
 * inspect what landed there.
 *
 * Subdirectories (`inflight/`, `.bad/`) are ignored — only files at the top
 * level of the queue dir are considered schedulable. Inflight entries
 * represent jobs that have been claimed by the supervisor but not yet
 * registered as a child; the queue-processor is responsible for either
 * releasing or requeueing them.
 */
export function listQueuedRuns(root: string): ArtLabQueueEntry[] {
  const path = queueDir(root);
  const entries: ArtLabQueueEntry[] = [];
  for (const f of readdirSync(path, { withFileTypes: true })) {
    if (!f.isFile()) continue;
    if (!f.name.endsWith(".json")) continue;
    const filePath = join(path, f.name);
    try {
      const raw = readFileSync(filePath, "utf8");
      const parsed = ArtLabQueueEntrySchema.parse(JSON.parse(raw));
      entries.push(parsed);
    } catch {
      quarantineCorruptEntry(root, filePath, f.name);
    }
  }
  return entries.sort((a, b) => {
    const rank = priorityRank(a.priority) - priorityRank(b.priority);
    if (rank !== 0) return rank;
    return a.enqueuedAt.localeCompare(b.enqueuedAt);
  });
}

function quarantineCorruptEntry(root: string, src: string, fileName: string): void {
  try {
    const dst = join(badDir(root), `${Date.now()}-${fileName}`);
    // Move via rename — if rename fails (cross-device), fall back to unlink.
    try {
      renameSync(src, dst);
    } catch {
      try { unlinkSync(src); } catch { /* swallow */ }
    }
  } catch { /* never let quarantine break the queue */ }
}

/**
 * Dequeue the next-highest-priority job by RENAMING the queue file into
 * `<queue>/inflight/<runId>.json`. The caller (queue-processor) is then
 * obliged to either {@link releaseInflight} after a successful spawn or
 * {@link requeueInflight} on failure. This rename-first pattern is the
 * atomic boundary: a spawn crash mid-tick cannot silently drop a job
 * because the inflight file is durable until explicitly released.
 */
export function dequeueNextRun(root: string): ArtLabQueueEntry | null {
  const list = listQueuedRuns(root);
  if (list.length === 0) return null;
  const next = list[0]!;
  const src = join(queueDir(root), `${next.runId}.json`);
  const dst = join(inflightDir(root), `${next.runId}.json`);
  try {
    renameSync(src, dst);
  } catch {
    return null;
  }
  return next;
}

/**
 * Remove an inflight entry after the supervisor has successfully accepted
 * the child. The queue-processor calls this once registration succeeds.
 */
export function releaseInflight(root: string, runId: string): boolean {
  const path = join(inflightDir(root), `${runId}.json`);
  if (!existsSync(path)) return false;
  try { unlinkSync(path); return true; } catch { return false; }
}

/**
 * Move an inflight entry back into the queue (rename `inflight/<runId>.json`
 * → `<runId>.json`). The queue-processor calls this on spawn throw or when
 * the supervisor rejected registration after spawning, so the job is
 * retried on the next tick instead of silently dropped.
 */
export function requeueInflight(root: string, runId: string): boolean {
  const src = join(inflightDir(root), `${runId}.json`);
  if (!existsSync(src)) return false;
  const dst = join(queueDir(root), `${runId}.json`);
  try { renameSync(src, dst); return true; } catch { return false; }
}

/**
 * Count of currently inflight entries. Surfaced on the health view so
 * operators can spot a wedged supervisor (e.g., a job claimed but never
 * registered or requeued).
 */
export function inflightCount(root: string): number {
  const path = join(queueDir(root), "inflight");
  if (!existsSync(path)) return 0;
  return readdirSync(path).filter((f) => f.endsWith(".json")).length;
}

export function removeFromQueue(root: string, runId: string): boolean {
  const path = join(queueDir(root), `${runId}.json`);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}
