import fs from "fs-extra";
import path from "node:path";

const UNDO_REL = ".tower/.cache/undo.json";
const CAP = 10;

export interface UndoEntry {
  op: string;
  phase: string;
  snapshot: string; // stringified ledger YAML
  when?: string;
}

async function readStack(repo: string): Promise<UndoEntry[]> {
  const p = path.join(repo, UNDO_REL);
  if (!(await fs.pathExists(p))) return [];
  return fs.readJson(p).catch(() => []);
}

async function writeStack(repo: string, stack: UndoEntry[]): Promise<void> {
  const p = path.join(repo, UNDO_REL);
  await fs.ensureDir(path.dirname(p));
  await fs.writeJson(p, stack, { spaces: 2 });
}

export async function pushUndo(
  repo: string,
  entry: UndoEntry,
): Promise<void> {
  const stack = await readStack(repo);
  stack.push({ ...entry, when: entry.when ?? new Date().toISOString() });
  while (stack.length > CAP) stack.shift();
  await writeStack(repo, stack);
}

export async function popUndo(repo: string): Promise<UndoEntry | null> {
  const stack = await readStack(repo);
  const last = stack.pop() ?? null;
  await writeStack(repo, stack);
  return last;
}

export async function peekUndo(repo: string): Promise<UndoEntry | null> {
  const stack = await readStack(repo);
  return stack.length > 0 ? stack[stack.length - 1] : null;
}
