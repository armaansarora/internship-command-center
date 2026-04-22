import { describe, it, expect, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { execa } from "execa";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const TSX_BIN = path.join(PROJECT_ROOT, "node_modules/.bin/tsx");
const VERIFY_ENTRY = path.join(PROJECT_ROOT, "scripts/ledger/verify.ts");

/** Minimal ledger YAML matching the LedgerSchema shape. */
function ledgerYaml(opts: {
  phase: string;
  tasks: Record<string, { status: string; notes?: string }>;
}): string {
  const tasks = Object.entries(opts.tasks)
    .map(([id, t]) => {
      const lines = [`  ${id}:`, `    title: t`, `    status: ${t.status}`];
      if (t.notes !== undefined) lines.push(`    notes: ${JSON.stringify(t.notes)}`);
      return lines.join("\n");
    })
    .join("\n");
  return [
    `phase: ${opts.phase}`,
    "name: Test Phase",
    "status: in_progress",
    "intent: test",
    "started: 2026-04-22T00:00:00Z",
    "completed: null",
    "tasks:",
    tasks,
    "blockers: []",
    "decisions: []",
    "history: []",
    "",
  ].join("\n");
}

async function createTmpRepo(
  files: Record<string, string> = {},
): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ledger-verify-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    await fs.ensureDir(path.dirname(full));
    await fs.writeFile(full, content);
  }
  return dir;
}

async function cleanup(dir: string): Promise<void> {
  if (!dir.startsWith(os.tmpdir())) {
    throw new Error(`refusing to remove non-tmpdir: ${dir}`);
  }
  await fs.remove(dir);
}

function runVerify(cwd: string, args: string[] = []) {
  return execa(TSX_BIN, [VERIFY_ENTRY, ...args], { cwd, reject: false });
}

describe("scripts/ledger/verify", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanup(repo);
    repo = undefined;
  });

  it("returns exit 0 and reports 0 issues when all evidence paths exist", async () => {
    repo = await createTmpRepo({
      "src/foo.ts": "export {}\n",
      "src/bar.ts": "export {}\n",
      ".ledger/R2-war.yml": ledgerYaml({
        phase: "R2",
        tasks: {
          "R2.1": {
            status: "in_progress",
            notes: "Evidence: src/foo.ts, src/bar.ts",
          },
        },
      }),
    });

    const result = await runVerify(repo);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/ledger verify OK/);
    expect(result.stdout).toMatch(/1 phase file\(s\)/);
    expect(result.stdout).toMatch(/0 issue\(s\)/);
  });

  it("reports the issue and exits 1 when a task's evidence path is missing", async () => {
    repo = await createTmpRepo({
      "src/foo.ts": "export {}\n",
      ".ledger/R3-test.yml": ledgerYaml({
        phase: "R3",
        tasks: {
          "R3.2": {
            status: "complete",
            notes: "Evidence: src/foo.ts, src/missing.ts",
          },
        },
      }),
    });

    const result = await runVerify(repo);
    expect(result.exitCode).toBe(1);
    const out = result.stdout + result.stderr;
    expect(out).toMatch(/R3\.R3\.2|R3\.2/);
    expect(out).toMatch(/src\/missing\.ts/);
    expect(out).toMatch(/1 issue\(s\)/);
  });

  it("exits 0 under --warn-only even when there are missing-evidence issues", async () => {
    repo = await createTmpRepo({
      ".ledger/R4-test.yml": ledgerYaml({
        phase: "R4",
        tasks: {
          "R4.1": {
            status: "in_progress",
            notes: "Evidence: src/missing.ts",
          },
        },
      }),
    });

    const result = await runVerify(repo, ["--warn-only"]);
    expect(result.exitCode).toBe(0);
    const out = result.stdout + result.stderr;
    expect(out).toMatch(/src\/missing\.ts/);
    expect(out).toMatch(/1 issue\(s\)/);
  });

  it("ignores tasks in not_started status (no evidence expected yet)", async () => {
    repo = await createTmpRepo({
      ".ledger/R5-test.yml": ledgerYaml({
        phase: "R5",
        tasks: {
          "R5.1": {
            status: "not_started",
            notes: "Evidence: src/nothing-yet.ts",
          },
        },
      }),
    });

    const result = await runVerify(repo);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/0 issue\(s\)/);
  });

  it("handles tasks with no notes field without throwing", async () => {
    repo = await createTmpRepo({
      ".ledger/R6-test.yml": ledgerYaml({
        phase: "R6",
        tasks: {
          "R6.1": { status: "in_progress" },
        },
      }),
    });

    const result = await runVerify(repo);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/0 issue\(s\)/);
  });
});
