import { describe, it, expect, afterEach } from "vitest";
import { execa } from "execa";
import path from "node:path";
import { createFixtureRepo, cleanupFixture } from "../test-helpers.js";

const CLI = path.join(process.cwd(), "scripts/tower/index.ts");

function mk(
  phase: string,
  name: string,
  status: string,
  tasks: Record<string, string>,
): string {
  const t = Object.entries(tasks)
    .map(([id, s]) => `  ${id}:\n    title: t\n    status: ${s}`)
    .join("\n");
  return [
    `phase: ${phase}`,
    `name: ${name}`,
    `status: ${status}`,
    "intent: test",
    "started: null",
    "completed: null",
    "tasks:",
    t || "  {}",
    "blockers: []",
    "decisions: []",
    "history: []",
    "",
  ].join("\n");
}

describe("tower phases", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("lists phase rows with status and task count", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-harden.yml": mk("R0", "Harden", "complete", {
        "R0.1": "complete",
      }),
      ".ledger/R1-obs.yml": mk("R1", "Obs", "in_progress", {
        "R1.1": "complete",
        "R1.2": "in_progress",
      }),
      ".ledger/R2-war.yml": mk("R2", "War", "not_started", {}),
    });
    const { stdout } = await execa("npx", ["tsx", CLI, "phases"], {
      cwd: repo,
    });
    expect(stdout).toMatch(/R0.*Harden.*complete.*1\/1/);
    expect(stdout).toMatch(/R1.*Obs.*in_progress.*1\/2/);
    expect(stdout).toMatch(/R2.*War.*not_started.*0\/0/);
  });

  it("exits 0 on empty ledger", async () => {
    repo = await createFixtureRepo();
    const { stdout, exitCode } = await execa(
      "npx",
      ["tsx", CLI, "phases"],
      { cwd: repo },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/no phases/i);
  });
});
