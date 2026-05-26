// src/lib/artlab/daemon/daemon-lock.test.ts
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DaemonAlreadyRunningError, acquireDaemonLock } from "./daemon-lock";

describe("acquireDaemonLock", () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "foundry-daemon-lock-"));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it("creates .lock.daemon.json with current pid + scope", () => {
    const handle = acquireDaemonLock({ workspaceRoot, pid: 42424 });
    expect(handle.lockPath).toBe(join(workspaceRoot, ".lock.daemon.json"));
    expect(handle.pid).toBe(42424);
    expect(existsSync(handle.lockPath)).toBe(true);
    const parsed = JSON.parse(readFileSync(handle.lockPath, "utf8"));
    expect(parsed.pid).toBe(42424);
    expect(parsed.scope).toBe("daemon");
    expect(typeof parsed.acquiredAt).toBe("string");
  });

  it("release() removes the lock file", () => {
    const handle = acquireDaemonLock({ workspaceRoot, pid: 42424 });
    handle.release();
    expect(existsSync(handle.lockPath)).toBe(false);
  });

  it("release() is idempotent", () => {
    const handle = acquireDaemonLock({ workspaceRoot, pid: 42424 });
    handle.release();
    expect(() => handle.release()).not.toThrow();
  });

  it("refuses a second acquisition when the first holder is alive", () => {
    const first = acquireDaemonLock({ workspaceRoot, pid: 42424, isProcessAlive: () => true });
    expect(() =>
      acquireDaemonLock({ workspaceRoot, pid: 42425, isProcessAlive: () => true }),
    ).toThrow(DaemonAlreadyRunningError);
    first.release();
  });

  it("reclaims a stale lock when the prior pid is no longer alive", () => {
    // Simulate a previous daemon that crashed without releasing.
    writeFileSync(
      join(workspaceRoot, ".lock.daemon.json"),
      JSON.stringify({ pid: 999999, scope: "daemon", acquiredAt: "stale" }),
    );
    const handle = acquireDaemonLock({
      workspaceRoot,
      pid: 42424,
      isProcessAlive: () => false,
    });
    const parsed = JSON.parse(readFileSync(handle.lockPath, "utf8"));
    expect(parsed.pid).toBe(42424);
    handle.release();
  });

  it("reclaims a corrupt lock file as stale", () => {
    // Corrupt JSON should be treated as stale (cannot read holder pid).
    writeFileSync(join(workspaceRoot, ".lock.daemon.json"), "this is not json {{{");
    const handle = acquireDaemonLock({
      workspaceRoot,
      pid: 42424,
      isProcessAlive: () => true, // even if "alive", a corrupt lock yields holderPid=0 → reclaimable
    });
    expect(existsSync(handle.lockPath)).toBe(true);
    handle.release();
  });

  it("includes holder pid + lock path in DaemonAlreadyRunningError", () => {
    const first = acquireDaemonLock({ workspaceRoot, pid: 42424, isProcessAlive: () => true });
    try {
      acquireDaemonLock({ workspaceRoot, pid: 42425, isProcessAlive: () => true });
      throw new Error("acquireDaemonLock should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(DaemonAlreadyRunningError);
      const lockErr = err as DaemonAlreadyRunningError;
      expect(lockErr.holderPid).toBe(42424);
      expect(lockErr.lockPath).toBe(join(workspaceRoot, ".lock.daemon.json"));
      expect(lockErr.message).toContain("pid 42424");
    } finally {
      first.release();
    }
  });
});
