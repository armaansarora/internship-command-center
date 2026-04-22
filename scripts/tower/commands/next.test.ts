import { describe, it, expect, afterEach } from "vitest";
import {
  createFixtureRepo,
  cleanupFixture,
  runCLI,
} from "../test-helpers.js";

function seed(
  phase: string,
  pstatus: string,
  tasks: Record<string, string>,
): string {
  const t = Object.entries(tasks)
    .map(([id, s]) => `  ${id}: { title: T${id}, status: ${s} }`)
    .join("\n");
  return [
    `phase: ${phase}`,
    "name: T",
    `status: ${pstatus}`,
    "intent: t",
    "started: null",
    "completed: null",
    "tasks:",
    t,
    "blockers: []",
    "decisions: []",
    "history: []",
    "",
  ].join("\n");
}

describe("tower next", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("returns first in_progress task if any", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": seed("R2", "in_progress", {
        "R2.1": "complete",
        "R2.2": "in_progress",
        "R2.3": "not_started",
      }),
    });
    const { stdout } = await runCLI(["next"], { cwd: repo });
    expect(stdout).toContain("R2.2");
  });

  it("returns first not_started task if no in_progress", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": seed("R2", "in_progress", {
        "R2.1": "complete",
        "R2.2": "not_started",
        "R2.3": "not_started",
      }),
    });
    const { stdout } = await runCLI(["next"], { cwd: repo });
    expect(stdout).toContain("R2.2");
  });

  it("says all phases complete when all done", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-foo.yml": seed("R0", "complete", { "R0.1": "complete" }),
    });
    const { stdout } = await runCLI(["next"], { cwd: repo });
    expect(stdout).toMatch(/all phases complete/i);
  });
});
