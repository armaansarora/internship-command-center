import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireArtLabLock, releaseArtLabLock, isArtLabLocked } from "./lock";

describe("artlab engine lock", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-lock-")); });

  it("acquires and releases", () => {
    const lock = acquireArtLabLock(dir, "test-scope");
    expect(lock.acquired).toBe(true);
    expect(isArtLabLocked(dir, "test-scope")).toBe(true);
    releaseArtLabLock(dir, "test-scope");
    expect(isArtLabLocked(dir, "test-scope")).toBe(false);
  });

  it("refuses second acquire while held", () => {
    acquireArtLabLock(dir, "scope-a");
    const second = acquireArtLabLock(dir, "scope-a");
    expect(second.acquired).toBe(false);
    expect(second.reason).toMatch(/already held/i);
    releaseArtLabLock(dir, "scope-a");
  });

  it("considers stale lock with no live PID as expired", () => {
    const path = join(dir, ".lock.scope-stale.json");
    writeFileSync(path, JSON.stringify({ pid: 999999, scope: "scope-stale", acquiredAt: new Date().toISOString() }));
    const result = acquireArtLabLock(dir, "scope-stale");
    expect(result.acquired).toBe(true);
    expect(result.tookFromStale).toBe(true);
  });
});
