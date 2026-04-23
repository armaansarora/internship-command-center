import { describe, it, expect, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import YAML from "yaml";
import {
  createFixtureRepo,
  cleanupFixture,
  commitFile,
  runCLI,
} from "../test-helpers.js";

function ledger(
  phase: string,
  tasks: Record<string, { status: string; commit?: string }>,
  acceptanceMet = false,
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
    "acceptance:",
    "  criteria:",
    "    - t",
    `  met: ${acceptanceMet ? "true" : "false"}`,
    "  verified_by_commit: null",
    "",
  ].join("\n");
}

const SHELL_SKIPS = [
  "--skip-tests",
  "--skip-types",
  "--skip-build",
  "--skip-lint",
];

describe("tower accept", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("flips acceptance.met when all tasks complete + no drift", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": ledger("R0", {
        "R0.1": { status: "complete" },
      }),
    });
    await commitFile(repo, "a.ts", "a", "[R0/0.1] feat: first");
    const result = await runCLI(["accept", "R0", ...SHELL_SKIPS], {
      cwd: repo,
      reject: false,
    });
    expect(result.exitCode).toBe(0);

    const yml = await fs.readFile(
      path.join(repo, ".ledger/R0-x.yml"),
      "utf-8",
    );
    const led = YAML.parse(yml);
    expect(led.acceptance.met).toBe(true);
    expect(led.acceptance.verified_by_commit).toBeTruthy();
  });

  it("REFUSES to flip when tasks are incomplete (this is the R5.4 bug)", async () => {
    repo = await createFixtureRepo({
      ".ledger/R5-x.yml": ledger("R5", {
        "R5.1": { status: "complete" },
        "R5.4": { status: "not_started" },
      }),
    });
    await commitFile(repo, "a.ts", "a", "[R5/5.1] feat: one");
    const result = await runCLI(["accept", "R5", ...SHELL_SKIPS], {
      cwd: repo,
      reject: false,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("cannot accept");

    const yml = await fs.readFile(
      path.join(repo, ".ledger/R5-x.yml"),
      "utf-8",
    );
    const led = YAML.parse(yml);
    expect(led.acceptance.met).toBe(false);
  });

  it("REFUSES to flip when blockers are open", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": [
        "phase: R0",
        "name: Test",
        "status: in_progress",
        "intent: t",
        "started: null",
        "completed: null",
        "tasks:",
        "  R0.1:",
        "    title: t",
        "    status: complete",
        "blockers:",
        "  - id: B1",
        "    task: R0.1",
        "    opened: 2026-04-23T10:00:00Z",
        "    text: open blocker",
        "    resolved: null",
        "decisions: []",
        "history: []",
        "acceptance:",
        "  criteria: [t]",
        "  met: false",
        "  verified_by_commit: null",
        "",
      ].join("\n"),
    });
    await commitFile(repo, "a.ts", "a", "[R0/0.1] feat: first");
    const result = await runCLI(["accept", "R0", ...SHELL_SKIPS], {
      cwd: repo,
      reject: false,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("cannot accept");
  });

  it("--force bypasses the gate but records it in history", async () => {
    repo = await createFixtureRepo({
      ".ledger/R5-x.yml": ledger("R5", {
        "R5.1": { status: "complete" },
        "R5.4": { status: "not_started" },
      }),
    });
    await commitFile(repo, "a.ts", "a", "[R5/5.1] feat: one");
    const result = await runCLI(
      ["accept", "R5", "--force", ...SHELL_SKIPS],
      { cwd: repo, reject: false },
    );
    expect(result.exitCode).toBe(0);

    const yml = await fs.readFile(
      path.join(repo, ".ledger/R5-x.yml"),
      "utf-8",
    );
    const led = YAML.parse(yml);
    expect(led.acceptance.met).toBe(true);
    const bypass = led.history.some((h: Record<string, string>) => {
      const v = Object.values(h)[0] as string;
      return v.includes("acceptance_forced_bypass");
    });
    expect(bypass).toBe(true);
  });

  it("short-circuits when acceptance.met is already true", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": ledger("R0", { "R0.1": { status: "complete" } }, true),
    });
    const result = await runCLI(["accept", "R0", ...SHELL_SKIPS], {
      cwd: repo,
      reject: false,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("already");
  });
});
