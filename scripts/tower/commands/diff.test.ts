import { describe, it, expect, afterEach } from "vitest";
import {
  createFixtureRepo,
  cleanupFixture,
  runCLI,
} from "../test-helpers.js";

describe("tower diff / verify", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("diff prints drift items, exit 0 by default", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": [
        "phase: R2",
        "name: War",
        "status: in_progress",
        "intent: t",
        "started: null",
        "completed: null",
        "tasks:",
        "  R2.1: { title: t, status: complete, commit: abc }",
        "blockers: []",
        "decisions: []",
        "history: []",
        "",
      ].join("\n"),
    });
    const r = await runCLI(["diff"], { cwd: repo });
    expect(r.stdout).toMatch(/R2\.1/);
    expect(r.exitCode).toBe(0);
  });

  it("diff --strict exits 1 on drift", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": [
        "phase: R2",
        "name: War",
        "status: in_progress",
        "intent: t",
        "started: null",
        "completed: null",
        "tasks:",
        "  R2.1: { title: t, status: complete, commit: abc }",
        "blockers: []",
        "decisions: []",
        "history: []",
        "",
      ].join("\n"),
    });
    const r = await runCLI(["diff", "--strict"], { cwd: repo, reject: false });
    expect(r.exitCode).toBe(1);
  });

  it("diff prints 'clean' with no drift", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-foo.yml": [
        "phase: R0",
        "name: Foo",
        "status: not_started",
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
    const { stdout } = await runCLI(["diff"], { cwd: repo });
    expect(stdout).toMatch(/clean/);
  });
});
