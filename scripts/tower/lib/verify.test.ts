import { describe, it, expect, afterEach } from "vitest";
import { runVerify } from "./verify.js";
import {
  createFixtureRepo,
  cleanupFixture,
  commitFile,
} from "../test-helpers.js";

// Shell checks (npm/tsc/build/lint) don't work inside a tmpdir fixture —
// no package.json, no node_modules. Pass skip flags for those and test
// the pure phase/drift logic here.
const SKIP_SHELLS = {
  skipTests: true,
  skipTypes: true,
  skipBuild: true,
  skipLint: true,
};

function mk(
  phase: string,
  tasks: Record<string, { status: string; commit?: string }>,
  blockers: Array<{ id: string; task: string; resolved?: string | null }> = [],
): string {
  const t = Object.entries(tasks)
    .map(
      ([id, v]) =>
        `  ${id}:\n    title: t\n    status: ${v.status}${
          v.commit ? `\n    commit: ${v.commit}` : ""
        }`,
    )
    .join("\n");
  const b = blockers
    .map(
      (x) =>
        `  - id: ${x.id}\n    task: ${x.task}\n    opened: 2026-04-21T10:00:00Z\n    text: t\n    resolved: ${x.resolved ?? "null"}`,
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
    b ? `blockers:\n${b}` : "blockers: []",
    "decisions: []",
    "history: []",
    "",
  ].join("\n");
}

describe("runVerify", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("passes when all phase tasks complete + no drift + no blockers", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": mk("R0", {
        "R0.1": { status: "complete" },
        "R0.2": { status: "complete" },
      }),
    });
    await commitFile(repo, "a.ts", "a", "[R0/0.1] first");
    await commitFile(repo, "b.ts", "b", "[R0/0.2] second");
    const report = await runVerify(repo, { phase: "R0", ...SKIP_SHELLS });
    expect(report.ok).toBe(true);
    expect(report.checks.find((c) => c.name === "R0 tasks")?.ok).toBe(true);
    expect(report.checks.find((c) => c.name === "Blockers")?.ok).toBe(true);
    expect(report.checks.find((c) => c.name === "Drift")?.ok).toBe(true);
  });

  it("fails when phase has incomplete tasks", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": mk("R0", {
        "R0.1": { status: "complete" },
        "R0.2": { status: "in_progress" },
      }),
    });
    const report = await runVerify(repo, { phase: "R0", ...SKIP_SHELLS });
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.name === "R0 tasks")?.message).toMatch(
      /1\/2/,
    );
  });

  it("fails when open blockers exist", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": mk(
        "R0",
        { "R0.1": { status: "complete" } },
        [{ id: "B1", task: "R0.1", resolved: null }],
      ),
    });
    const report = await runVerify(repo, { phase: "R0", ...SKIP_SHELLS });
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.name === "Blockers")?.ok).toBe(false);
  });

  it("fails on drift — ledger claims complete but no matching commit", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": mk("R0", {
        "R0.1": { status: "complete", commit: "deadbeef" },
      }),
    });
    const report = await runVerify(repo, { phase: "R0", ...SKIP_SHELLS });
    expect(report.checks.find((c) => c.name === "Drift")?.ok).toBe(false);
  });

  it("picks active phase when none specified", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": mk("R0", { "R0.1": { status: "complete" } }),
    });
    await commitFile(repo, "a.ts", "a", "[R0/0.1] first");
    const report = await runVerify(repo, { ...SKIP_SHELLS });
    expect(report.phase).toBe("R0");
  });

  it("skipDrift skips the drift check entirely", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": mk("R0", {
        "R0.1": { status: "complete", commit: "deadbeef" },
      }),
    });
    const report = await runVerify(repo, {
      phase: "R0",
      skipDrift: true,
      ...SKIP_SHELLS,
    });
    expect(report.checks.find((c) => c.name === "Drift")).toBeUndefined();
  });
});
