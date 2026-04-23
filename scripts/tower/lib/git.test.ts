import { describe, it, expect, afterEach } from "vitest";
import { parseCommitTags, taggedCommitsSince, readRepoHead } from "./git.js";
import {
  createFixtureRepo,
  cleanupFixture,
  commitFile,
} from "../test-helpers.js";

describe("parseCommitTags", () => {
  it("extracts [Rn/n.n] from message", () => {
    expect(parseCommitTags("[R2/2.3] feat: thing")).toEqual([
      { phase: "R2", task: "R2.3" },
    ]);
  });
  it("handles multiple tags", () => {
    expect(parseCommitTags("[R2/2.1] [R2/2.2] feat: combined")).toHaveLength(
      2,
    );
  });
  it("returns empty for untagged", () => {
    expect(parseCommitTags("feat: untagged")).toEqual([]);
  });
  it("ignores malformed tags", () => {
    expect(parseCommitTags("[R2] [r2/2.3] feat: x")).toEqual([]);
  });
  it("strips letter suffix for split-subtask commits (a/b pattern)", () => {
    expect(parseCommitTags("[R6/6.6a] feat: part one")).toEqual([
      { phase: "R6", task: "R6.6" },
    ]);
    expect(parseCommitTags("[R6/6.6b] feat: part two")).toEqual([
      { phase: "R6", task: "R6.6" },
    ]);
  });
  it("returns multiple tags from bundled commit subjects", () => {
    const tags = parseCommitTags("[R4/4.7] [R4/4.8] feat: bundled");
    expect(tags.map((t) => t.task).sort()).toEqual(["R4.7", "R4.8"]);
  });
});

describe("taggedCommitsSince", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("returns commits with R-tags, newest first", async () => {
    repo = await createFixtureRepo();
    await commitFile(repo, "a.txt", "a", "[R0/0.1] first");
    await commitFile(repo, "b.txt", "b", "untagged");
    await commitFile(repo, "c.txt", "c", "[R1/1.2] second");

    const commits = await taggedCommitsSince(repo);
    expect(commits).toHaveLength(2);
    expect(commits[0].tag.task).toBe("R1.2");
    expect(commits[1].tag.task).toBe("R0.1");
  });

  it("supports --since filter", async () => {
    repo = await createFixtureRepo();
    await commitFile(repo, "a.txt", "a", "[R0/0.1] first");
    await new Promise((r) => setTimeout(r, 1100));
    const cutoff = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 1100));
    await commitFile(repo, "b.txt", "b", "[R0/0.2] second");
    const commits = await taggedCommitsSince(repo, cutoff);
    expect(commits).toHaveLength(1);
    expect(commits[0].tag.task).toBe("R0.2");
  });
});

describe("readRepoHead", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("returns short sha + subject + iso ts", async () => {
    repo = await createFixtureRepo();
    const info = await readRepoHead(repo);
    expect(info.sha).toMatch(/^[a-f0-9]{7,}$/);
    expect(info.subject).toBe("init");
    expect(info.committedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});
