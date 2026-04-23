import { describe, it, expect, afterEach } from "vitest";
import {
  createFixtureRepo,
  cleanupFixture,
  commitFile,
  runCLI,
} from "../test-helpers.js";

describe("tower log", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("lists R-tagged commits newest first", async () => {
    repo = await createFixtureRepo();
    await commitFile(repo, "a.txt", "a", "[R0/0.1] first");
    await commitFile(repo, "b.txt", "b", "untagged");
    await commitFile(repo, "c.txt", "c", "[R1/1.2] second");
    const { stdout } = await runCLI(["log"], { cwd: repo });
    const lines = stdout.split("\n").filter(Boolean);
    expect(lines[0]).toContain("[R1/1.2]");
    expect(lines[1]).toContain("[R0/0.1]");
    expect(stdout).not.toContain("untagged");
  });
});
