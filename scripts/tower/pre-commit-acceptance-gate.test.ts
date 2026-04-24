import { describe, it, expect, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import { execa } from "execa";
import {
  createFixtureRepo,
  cleanupFixture,
  commitFile,
} from "./test-helpers.js";

const GATE_SCRIPT = path.resolve(
  __dirname,
  "pre-commit-acceptance-gate.ts",
);
const TSX_BIN = path.resolve(__dirname, "../../node_modules/.bin/tsx");

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

async function runGate(repo: string) {
  return execa(TSX_BIN, [GATE_SCRIPT], { cwd: repo, reject: false });
}

describe("pre-commit acceptance gate", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("passes when no ledger files are being modified", async () => {
    repo = await createFixtureRepo();
    const result = await runGate(repo);
    expect(result.exitCode).toBe(0);
  });

  it("passes when the acceptance flip is backed by a passing verify", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": ledger(
        "R0",
        { "R0.1": { status: "complete" } },
        false,
      ),
    });
    await commitFile(repo, "a.ts", "a", "[R0/0.1] feat: first");

    // Flip acceptance.met in the ledger and stage it.
    const ledgerPath = path.join(repo, ".ledger/R0-x.yml");
    await fs.writeFile(
      ledgerPath,
      ledger("R0", { "R0.1": { status: "complete" } }, true),
      "utf-8",
    );
    await execa("git", ["add", ".ledger/R0-x.yml"], { cwd: repo });

    const result = await runGate(repo);
    if (result.exitCode !== 0) {
      // Surface the actual failure reason in the assertion message so future
      // regressions are debuggable without re-running by hand.
      expect(
        result.exitCode,
        `gate blocked a clean flip; stderr=${result.stderr} stdout=${result.stdout}`,
      ).toBe(0);
    }
    expect(result.exitCode).toBe(0);
  });

  it("BLOCKS the commit when acceptance flips true but tasks are incomplete", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": ledger(
        "R0",
        {
          "R0.1": { status: "complete" },
          "R0.2": { status: "not_started" },
        },
        false,
      ),
    });
    await commitFile(repo, "a.ts", "a", "[R0/0.1] feat: first");

    const ledgerPath = path.join(repo, ".ledger/R0-x.yml");
    await fs.writeFile(
      ledgerPath,
      ledger(
        "R0",
        {
          "R0.1": { status: "complete" },
          "R0.2": { status: "not_started" },
        },
        true, // <- the bypass
      ),
      "utf-8",
    );
    await execa("git", ["add", ".ledger/R0-x.yml"], { cwd: repo });

    const result = await runGate(repo);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("tower verify failed");
  });

  it("ignores staged ledgers where acceptance.met was already true", async () => {
    // Subsequent commits that touch a ledger which is ALREADY accepted
    // shouldn't re-run verify — only a false→true flip triggers the gate.
    repo = await createFixtureRepo({
      ".ledger/R0-x.yml": ledger(
        "R0",
        { "R0.1": { status: "complete" } },
        true,
      ),
    });
    await commitFile(repo, "a.ts", "a", "[R0/0.1] feat: first");

    // Touch the already-accepted ledger (add a history entry, don't flip met).
    const ledgerPath = path.join(repo, ".ledger/R0-x.yml");
    await fs.writeFile(
      ledgerPath,
      ledger("R0", { "R0.1": { status: "complete" } }, true) +
        "# trivial edit\n",
      "utf-8",
    );
    await execa("git", ["add", ".ledger/R0-x.yml"], { cwd: repo });

    const result = await runGate(repo);
    expect(result.exitCode).toBe(0);
  });
});
