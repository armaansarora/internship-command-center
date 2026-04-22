import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import fs from "fs-extra";
import {
  createFixtureRepo,
  cleanupFixture,
  runCLI,
} from "../test-helpers.js";

describe("tower resume", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("prints the latest handoff packet", async () => {
    repo = await createFixtureRepo();
    await fs.ensureDir(path.join(repo, ".handoff"));
    await fs.writeFile(
      path.join(repo, ".handoff/2026-04-21-1530.md"),
      "---\nsession_id: sess-x\n---\n\n## Shipped\n- done\n",
    );
    const { stdout } = await runCLI(["resume"], { cwd: repo });
    expect(stdout).toContain("sess-x");
    expect(stdout).toContain("Shipped");
  });

  it("notes when no handoff exists", async () => {
    repo = await createFixtureRepo();
    const { stdout } = await runCLI(["resume"], { cwd: repo });
    expect(stdout).toMatch(/no handoff/i);
  });
});
