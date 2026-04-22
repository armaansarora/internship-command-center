import { describe, it, expect, afterEach } from "vitest";
import {
  acquireLock,
  releaseLock,
  readLocks,
  isLocked,
} from "./lock.js";
import { createFixtureRepo, cleanupFixture } from "../test-helpers.js";

describe("lock manager", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("acquires a fresh lock", async () => {
    repo = await createFixtureRepo();
    const res = await acquireLock(repo, "R2", "sess-1", 120);
    expect(res.acquired).toBe(true);
    const locks = await readLocks(repo);
    expect(locks.R2?.holder).toBe("sess-1");
  });

  it("blocks acquisition when held by another session", async () => {
    repo = await createFixtureRepo();
    await acquireLock(repo, "R2", "sess-1", 120);
    const res = await acquireLock(repo, "R2", "sess-2", 120);
    expect(res.acquired).toBe(false);
    expect(res.heldBy).toBe("sess-1");
  });

  it("allows reacquisition by same holder (extends expiry)", async () => {
    repo = await createFixtureRepo();
    const first = await acquireLock(repo, "R2", "sess-1", 1);
    await new Promise((r) => setTimeout(r, 50));
    const second = await acquireLock(repo, "R2", "sess-1", 120);
    expect(second.acquired).toBe(true);
    expect(new Date(second.expires!).getTime()).toBeGreaterThan(
      new Date(first.expires!).getTime(),
    );
  });

  it("allows acquisition when lock expired", async () => {
    repo = await createFixtureRepo();
    await acquireLock(repo, "R2", "sess-1", -1);
    const res = await acquireLock(repo, "R2", "sess-2", 120);
    expect(res.acquired).toBe(true);
  });

  it("force acquisition steals lock", async () => {
    repo = await createFixtureRepo();
    await acquireLock(repo, "R2", "sess-1", 120);
    const res = await acquireLock(repo, "R2", "sess-2", 120, { force: true });
    expect(res.acquired).toBe(true);
    expect(res.stolenFrom).toBe("sess-1");
  });

  it("releases a lock", async () => {
    repo = await createFixtureRepo();
    await acquireLock(repo, "R2", "sess-1", 120);
    await releaseLock(repo, "R2", "sess-1");
    expect(await isLocked(repo, "R2")).toBe(false);
  });

  it("refuses to release a lock held by another session", async () => {
    repo = await createFixtureRepo();
    await acquireLock(repo, "R2", "sess-1", 120);
    await expect(releaseLock(repo, "R2", "sess-2")).rejects.toThrow();
  });
});
