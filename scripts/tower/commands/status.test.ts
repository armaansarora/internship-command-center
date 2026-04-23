import { describe, it, expect, afterEach } from "vitest";
import {
  createFixtureRepo,
  cleanupFixture,
  commitFile,
  runCLI,
} from "../test-helpers.js";

describe("tower status", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("prints current phase, progress, last commit, blockers", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": [
        "phase: R2",
        "name: War Room",
        "status: in_progress",
        "intent: pipeline heat map",
        "started: 2026-04-18T00:00:00Z",
        "completed: null",
        "lock: null",
        "acceptance:",
        "  criteria: []",
        "  met: false",
        "  verified_by_commit: null",
        "tasks:",
        "  R2.1: { title: a, status: complete, commit: xyz }",
        "  R2.2: { title: b, status: in_progress }",
        "  R2.3: { title: c, status: not_started }",
        "blockers:",
        "  - { id: B1, task: R2.2, opened: 2026-04-21T00:00:00Z, text: stall threshold, resolved: null }",
        "decisions: []",
        "history: []",
        "",
      ].join("\n"),
    });
    await commitFile(repo, "app.ts", "x", "[R2/2.1] feat: a");
    const { stdout } = await runCLI(["status"], { cwd: repo });
    expect(stdout).toMatch(/Phase:\s+R2/);
    expect(stdout).toMatch(/Progress:\s+1\/3/);
    expect(stdout).toMatch(/\[R2\/2\.1\]/);
    expect(stdout).toMatch(/Blockers:\s+1 open/);
  });

  it("handles empty ledger with hint", async () => {
    repo = await createFixtureRepo();
    const { stdout } = await runCLI(["status"], { cwd: repo });
    expect(stdout).toMatch(/no phases/i);
  });
});
