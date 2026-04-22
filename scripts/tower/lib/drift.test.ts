import { describe, it, expect, afterEach } from "vitest";
import { detectDrift } from "./drift.js";
import {
  createFixtureRepo,
  cleanupFixture,
  commitFile,
} from "../test-helpers.js";

function ledger(
  phase: string,
  tasks: Record<string, { status: string; commit?: string }>,
): string {
  const t = Object.entries(tasks)
    .map(
      ([id, v]) =>
        `  ${id}:\n    title: t\n    status: ${v.status}${
          v.commit ? `\n    commit: ${v.commit}` : ""
        }`,
    )
    .join("\n");
  return [
    `phase: ${phase}`,
    "name: Test",
    "status: in_progress",
    "intent: t",
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

describe("detectDrift", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("reports ledger-claim without matching commit tag", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": ledger("R2", {
        "R2.1": { status: "complete", commit: "deadbeef" },
      }),
    });
    const drift = await detectDrift(repo);
    expect(drift.items).toContainEqual(
      expect.objectContaining({
        kind: "ledger_claim_no_commit",
        phase: "R2",
        task: "R2.1",
      }),
    );
  });

  it("reports tagged commit without ledger task", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": ledger("R2", {}),
    });
    await commitFile(repo, "a.ts", "x", "[R2/2.9] feat: orphan");
    const drift = await detectDrift(repo);
    expect(drift.items).toContainEqual(
      expect.objectContaining({
        kind: "commit_no_ledger_task",
        phase: "R2",
        task: "R2.9",
      }),
    );
  });

  it("clean when ledger + git match", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": ledger("R2", {}),
    });
    const drift = await detectDrift(repo);
    expect(drift.items).toEqual([]);
  });
});
