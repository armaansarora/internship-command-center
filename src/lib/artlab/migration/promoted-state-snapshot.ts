// src/lib/artlab/migration/promoted-state-snapshot.ts
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export const SYMLINK_REJECTION_SHA256 = "symlink-rejected";

export interface PromotedStateEntry {
  path: string;
  sha256: string;
  sizeBytes: number;
  isSymlink?: boolean;
}

export interface PromotedStateSnapshot {
  rootDir: string;
  at: string;
  entries: PromotedStateEntry[];
}

export interface PromotedStateDiff {
  added: PromotedStateEntry[];
  removed: PromotedStateEntry[];
  changed: { path: string; before: string; after: string }[];
}

interface WalkEntry { rel: string; isSymlink: boolean; isFile: boolean; }

function walk(rootDir: string, sub = ""): WalkEntry[] {
  const result: WalkEntry[] = [];
  const dir = join(rootDir, sub);
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const rel = sub ? `${sub}/${name}` : name;
    const st = lstatSync(full);
    if (st.isSymbolicLink()) {
      result.push({ rel, isSymlink: true, isFile: false });
      continue;
    }
    if (st.isDirectory()) {
      result.push(...walk(rootDir, rel));
    } else if (st.isFile()) {
      result.push({ rel, isSymlink: false, isFile: true });
    }
  }
  return result;
}

export async function snapshotPromotedState(input: { rootDir: string }): Promise<PromotedStateSnapshot> {
  if (!existsSync(input.rootDir)) {
    return { rootDir: input.rootDir, at: new Date().toISOString(), entries: [] };
  }
  const files = walk(input.rootDir);
  const entries: PromotedStateEntry[] = files.map(({ rel, isSymlink }) => {
    if (isSymlink) {
      return { path: rel, sha256: SYMLINK_REJECTION_SHA256, sizeBytes: 0, isSymlink: true };
    }
    const bytes = readFileSync(join(input.rootDir, rel));
    return {
      path: rel,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sizeBytes: bytes.length,
    };
  });
  return { rootDir: input.rootDir, at: new Date().toISOString(), entries };
}

export function comparePromotedStateSnapshots(before: PromotedStateSnapshot, after: PromotedStateSnapshot): PromotedStateDiff {
  const beforeByPath = new Map(before.entries.map((e) => [e.path, e]));
  const afterByPath = new Map(after.entries.map((e) => [e.path, e]));
  const diff: PromotedStateDiff = { added: [], removed: [], changed: [] };
  for (const [path, entry] of afterByPath) {
    const b = beforeByPath.get(path);
    if (!b) diff.added.push(entry);
    else if (b.sha256 !== entry.sha256) diff.changed.push({ path, before: b.sha256, after: entry.sha256 });
  }
  for (const [path, entry] of beforeByPath) {
    if (!afterByPath.has(path)) diff.removed.push(entry);
  }
  return diff;
}
