import fs from "fs-extra";
import path from "node:path";
import YAML from "yaml";

interface LockRecord {
  holder: string;
  acquired: string;
  expires: string;
}

interface LockFile {
  locks: Record<string, LockRecord>;
}

const LOCK_REL = ".tower/lock.yml";

async function read(repo: string): Promise<LockFile> {
  const p = path.join(repo, LOCK_REL);
  if (!(await fs.pathExists(p))) return { locks: {} };
  const parsed = YAML.parse(await fs.readFile(p, "utf-8")) ?? {};
  return { locks: parsed.locks ?? {} };
}

async function write(repo: string, data: LockFile): Promise<void> {
  const p = path.join(repo, LOCK_REL);
  await fs.ensureDir(path.dirname(p));
  await fs.writeFile(p, YAML.stringify(data), "utf-8");
}

export async function readLocks(
  repo: string,
): Promise<Record<string, LockRecord>> {
  return (await read(repo)).locks;
}

export async function isLocked(repo: string, phase: string): Promise<boolean> {
  const { locks } = await read(repo);
  const l = locks[phase];
  if (!l) return false;
  return new Date(l.expires).getTime() > Date.now();
}

export interface AcquireResult {
  acquired: boolean;
  heldBy?: string;
  expires?: string;
  stolenFrom?: string;
}

export async function acquireLock(
  repo: string,
  phase: string,
  holder: string,
  ttlMinutes: number,
  opts: { force?: boolean } = {},
): Promise<AcquireResult> {
  const data = await read(repo);
  const current = data.locks[phase];
  const now = new Date();
  const active = current && new Date(current.expires).getTime() > now.getTime();

  if (active && current.holder !== holder && !opts.force) {
    return {
      acquired: false,
      heldBy: current.holder,
      expires: current.expires,
    };
  }

  const stolenFrom =
    active && current.holder !== holder && opts.force
      ? current.holder
      : undefined;
  const expires = new Date(
    now.getTime() + ttlMinutes * 60 * 1000,
  ).toISOString();
  data.locks[phase] = { holder, acquired: now.toISOString(), expires };
  await write(repo, data);
  return { acquired: true, expires, stolenFrom };
}

export async function releaseLock(
  repo: string,
  phase: string,
  holder: string,
): Promise<void> {
  const data = await read(repo);
  const current = data.locks[phase];
  if (!current) return;
  if (current.holder !== holder) {
    throw new Error(
      `cannot release lock on ${phase}: held by ${current.holder}, not ${holder}`,
    );
  }
  delete data.locks[phase];
  await write(repo, data);
}
