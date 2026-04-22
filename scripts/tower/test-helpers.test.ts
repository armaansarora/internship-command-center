import { describe, it, expect, afterEach } from "vitest";
import { createFixtureRepo, cleanupFixture } from "./test-helpers.js";
import fs from "fs-extra";
import path from "node:path";

describe("createFixtureRepo", () => {
  let fixture: string | undefined;

  afterEach(async () => {
    if (fixture) await cleanupFixture(fixture);
    fixture = undefined;
  });

  it("creates a tmpdir with initialised git repo", async () => {
    fixture = await createFixtureRepo();
    expect(await fs.pathExists(path.join(fixture, ".git"))).toBe(true);
  });

  it("seeds initial commit so HEAD exists", async () => {
    fixture = await createFixtureRepo();
    const { execa } = await import("execa");
    const { stdout } = await execa("git", ["log", "--oneline"], { cwd: fixture });
    expect(stdout).toMatch(/init/);
  });

  it("accepts optional files map to seed", async () => {
    fixture = await createFixtureRepo({
      ".ledger/R0-foo.yml": "phase: R0\nname: Foo\nstatus: not_started\n",
    });
    const contents = await fs.readFile(
      path.join(fixture, ".ledger/R0-foo.yml"),
      "utf-8",
    );
    expect(contents).toContain("phase: R0");
  });
});
