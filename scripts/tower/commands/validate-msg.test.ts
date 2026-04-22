import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import fs from "fs-extra";
import { execa } from "execa";
import {
  createFixtureRepo,
  cleanupFixture,
  runCLI,
} from "../test-helpers.js";

describe("tower validate-msg", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("warns (exit 0) when commit touches src/ without tag", async () => {
    repo = await createFixtureRepo();
    await fs.ensureDir(path.join(repo, "src"));
    await fs.writeFile(path.join(repo, "src/app.ts"), "x");
    await execa("git", ["add", "src/app.ts"], { cwd: repo });
    await fs.writeFile(
      path.join(repo, ".git/COMMIT_EDITMSG"),
      "feat: something",
    );
    const r = await runCLI(["validate-msg", ".git/COMMIT_EDITMSG"], {
      cwd: repo,
      reject: false,
    });
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toMatch(/untagged/i);
  });

  it("exits 0 silently when tag present and ledger has task", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": [
        "phase: R2",
        "name: W",
        "status: in_progress",
        "intent: t",
        "started: null",
        "completed: null",
        "tasks:",
        "  R2.1: { title: t, status: not_started }",
        "blockers: []",
        "decisions: []",
        "history: []",
        "",
      ].join("\n"),
    });
    await fs.writeFile(
      path.join(repo, ".git/COMMIT_EDITMSG"),
      "[R2/2.1] feat: work",
    );
    const r = await runCLI(["validate-msg", ".git/COMMIT_EDITMSG"], {
      cwd: repo,
    });
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toBe("");
  });

  it("warns when tag references unknown task", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": [
        "phase: R2",
        "name: W",
        "status: in_progress",
        "intent: t",
        "started: null",
        "completed: null",
        "tasks: {}",
        "blockers: []",
        "decisions: []",
        "history: []",
        "",
      ].join("\n"),
    });
    await fs.writeFile(
      path.join(repo, ".git/COMMIT_EDITMSG"),
      "[R2/2.9] feat: orphan",
    );
    const r = await runCLI(["validate-msg", ".git/COMMIT_EDITMSG"], {
      cwd: repo,
      reject: false,
    });
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toMatch(/R2\.9/);
  });
});
