import { describe, it, expect, afterEach } from "vitest";
import {
  createFixtureRepo,
  cleanupFixture,
  runCLI,
} from "../test-helpers.js";

function ledgerWithBlockers(
  phase: string,
  blockers: Array<{
    id: string;
    task: string;
    text: string;
    resolved: string | null;
  }>,
): string {
  const b = blockers
    .map(
      (x) =>
        `  - id: ${x.id}\n    task: ${x.task}\n    opened: 2026-04-21T10:00:00Z\n    text: ${JSON.stringify(x.text)}\n    resolved: ${x.resolved ? JSON.stringify(x.resolved) : "null"}`,
    )
    .join("\n");
  return [
    `phase: ${phase}`,
    "name: Test",
    "status: in_progress",
    "intent: test",
    "started: null",
    "completed: null",
    "tasks: {}",
    b ? `blockers:\n${b}` : "blockers: []",
    "decisions: []",
    "history: []",
    "",
  ].join("\n");
}

describe("tower blocked", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("lists unresolved blockers across phases", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": ledgerWithBlockers("R2", [
        { id: "B1", task: "R2.3", text: "threshold ambiguous", resolved: null },
        {
          id: "B2",
          task: "R2.1",
          text: "resolved already",
          resolved: "2026-04-19T10:00:00Z",
        },
      ]),
      ".ledger/R5-write.yml": ledgerWithBlockers("R5", [
        { id: "B1", task: "R5.2", text: "copy voice tbd", resolved: null },
      ]),
    });
    const { stdout } = await runCLI(["blocked"], { cwd: repo });
    expect(stdout).toContain("R2 · B1 · R2.3 · threshold ambiguous");
    expect(stdout).toContain("R5 · B1 · R5.2 · copy voice tbd");
    expect(stdout).not.toContain("resolved already");
  });

  it("prints 'no open blockers' when none", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": ledgerWithBlockers("R0", []),
    });
    const { stdout } = await runCLI(["blocked"], { cwd: repo });
    expect(stdout).toMatch(/no open blockers/);
  });
});
