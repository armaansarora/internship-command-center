import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ArtLabLockFile {
  pid: number;
  scope: string;
  acquiredAt: string;
}

export interface ArtLabLockResult {
  acquired: boolean;
  tookFromStale?: boolean;
  reason?: string;
}

function lockPath(workspaceRoot: string, scope: string): string {
  return join(workspaceRoot, `.lock.${scope}.json`);
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EPERM") return true;
    return false;
  }
}

export function acquireArtLabLock(workspaceRoot: string, scope: string): ArtLabLockResult {
  const path = lockPath(workspaceRoot, scope);
  if (existsSync(path)) {
    const existing = JSON.parse(readFileSync(path, "utf8")) as ArtLabLockFile;
    if (isPidAlive(existing.pid)) {
      return { acquired: false, reason: `already held by pid ${existing.pid}` };
    }
    unlinkSync(path);
    writeFileSync(path, JSON.stringify({ pid: process.pid, scope, acquiredAt: new Date().toISOString() } satisfies ArtLabLockFile), { flag: "wx" });
    return { acquired: true, tookFromStale: true };
  }
  writeFileSync(path, JSON.stringify({ pid: process.pid, scope, acquiredAt: new Date().toISOString() } satisfies ArtLabLockFile), { flag: "wx" });
  return { acquired: true };
}

export function releaseArtLabLock(workspaceRoot: string, scope: string): void {
  const path = lockPath(workspaceRoot, scope);
  if (existsSync(path)) unlinkSync(path);
}

export function isArtLabLocked(workspaceRoot: string, scope: string): boolean {
  return existsSync(lockPath(workspaceRoot, scope));
}
