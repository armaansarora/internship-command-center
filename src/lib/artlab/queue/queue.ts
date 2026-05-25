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
 */
export function listQueuedRuns(root: string): ArtLabQueueEntry[] {
  const path = queueDir(root);
  const entries: ArtLabQueueEntry[] = [];
  for (const f of readdirSync(path).filter((f) => f.endsWith(".json"))) {
    const filePath = join(path, f);
    try {
      const raw = readFileSync(filePath, "utf8");
      const parsed = ArtLabQueueEntrySchema.parse(JSON.parse(raw));
      entries.push(parsed);
    } catch {
      quarantineCorruptEntry(root, filePath, f);
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
    const badDir = join(queueDir(root), ".bad");
    if (!existsSync(badDir)) mkdirSync(badDir, { recursive: true });
    const dst = join(badDir, `${Date.now()}-${fileName}`);
    // Move via rename — if rename fails (cross-device), fall back to unlink.
    try {
      renameSync(src, dst);
    } catch {
      try { unlinkSync(src); } catch { /* swallow */ }
    }
  } catch { /* never let quarantine break the queue */ }
}

export function dequeueNextRun(root: string): ArtLabQueueEntry | null {
  const list = listQueuedRuns(root);
  if (list.length === 0) return null;
  const next = list[0]!;
  unlinkSync(join(queueDir(root), `${next.runId}.json`));
  return next;
}

export function removeFromQueue(root: string, runId: string): boolean {
  const path = join(queueDir(root), `${runId}.json`);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}
