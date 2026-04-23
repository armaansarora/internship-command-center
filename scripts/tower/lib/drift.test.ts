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

  it("accepts split-subtask commits (letter-suffix pattern)", async () => {
    repo = await createFixtureRepo({
      ".ledger/R6-briefing.yml": ledger("R6", {
        "R6.6": { status: "complete" },
      }),
    });
    await commitFile(repo, "a.ts", "a", "[R6/6.6a] drill: part one");
    await commitFile(repo, "b.ts", "b", "[R6/6.6b] drill: part two");
    const drift = await detectDrift(repo);
    expect(
      drift.items.filter((i) => i.kind === "ledger_claim_no_commit"),
    ).toEqual([]);
  });

  it("accepts bundled commits where multiple tasks share one commit tag", async () => {
    repo = await createFixtureRepo({
      ".ledger/R4-lobby.yml": ledger("R4", {
        "R4.7": { status: "complete" },
        "R4.8": { status: "complete" },
      }),
    });
    await commitFile(repo, "a.ts", "a", "[R4/4.7] [R4/4.8] feat: bundled");
    const drift = await detectDrift(repo);
    expect(
      drift.items.filter((i) => i.kind === "ledger_claim_no_commit"),
    ).toEqual([]);
  });

  it("accepts SHA-fallback when ledger commit exists but subject-tag mismatches", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": ledger("R2", {
        "R2.4": { status: "complete" },
        "R2.5": { status: "complete" },
      }),
    });
    const { stdout: sha } = await import("execa").then((m) =>
      m
        .execa("git", ["rev-parse", "HEAD"], { cwd: repo })
        .then(async () => {
          await commitFile(repo!, "a.ts", "a", "[R2/2.4] both");
          return m.execa("git", ["log", "-1", "--format=%H"], { cwd: repo! });
        }),
    );
    // Point R2.5 at the same commit SHA that's tagged with R2.4 — the bundling
    // pattern autopilot actually produced in the R2 ledger.
    const { writeFile } = await import("node:fs/promises");
    const path = `${repo}/.ledger/R2-war.yml`;
    await writeFile(
      path,
      ledger("R2", {
        "R2.4": { status: "complete", commit: sha.trim() },
        "R2.5": { status: "complete", commit: sha.trim() },
      }),
      "utf-8",
    );
    const drift = await detectDrift(repo);
    expect(
      drift.items.filter((i) => i.kind === "ledger_claim_no_commit"),
    ).toEqual([]);
  });
});
