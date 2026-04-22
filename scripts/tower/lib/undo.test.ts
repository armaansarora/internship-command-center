import { describe, it, expect, afterEach } from "vitest";
import { pushUndo, popUndo, peekUndo } from "./undo.js";
import { createFixtureRepo, cleanupFixture } from "../test-helpers.js";

describe("undo cache", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("records and replays snapshots LIFO", async () => {
    repo = await createFixtureRepo();
    await pushUndo(repo, { op: "done", phase: "R2", snapshot: "v1" });
    await pushUndo(repo, { op: "block", phase: "R2", snapshot: "v2" });
    const top = await popUndo(repo);
    expect(top?.snapshot).toBe("v2");
    const next = await popUndo(repo);
    expect(next?.snapshot).toBe("v1");
    expect(await popUndo(repo)).toBeNull();
  });

  it("caps stack at 10 entries", async () => {
    repo = await createFixtureRepo();
    for (let i = 0; i < 15; i++) {
      await pushUndo(repo, { op: "done", phase: "R0", snapshot: `v${i}` });
    }
    const last = await peekUndo(repo);
    expect(last?.snapshot).toBe("v14");
    let count = 0;
    while ((await popUndo(repo)) !== null) count++;
    expect(count).toBe(10);
  });
});
