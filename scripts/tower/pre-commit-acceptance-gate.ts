#!/usr/bin/env tsx
/**
 * Pre-commit gate: detects ledger files where acceptance.met is being flipped
 * from false → true in this commit, and refuses the commit unless the phase's
 * tower verify gate passes.
 *
 * Catches the R9 bypass pattern: autopilot hand-edited a .ledger YAML to flip
 * acceptance.met without going through `tower accept`. The structural gate
 * inside `tower accept` is the procedural check; this pre-commit hook is the
 * mechanical backstop — no way for ANY commit to set acceptance.met:true
 * unless verify passes.
 *
 * Fast checks only (tasks + blockers + drift). Shell checks (tsc/build/lint)
 * are skipped here since they're owned by CI and the pre-commit cost matters.
 */
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const repo = process.cwd();
// Resolve the tower CLI relative to this script's location, not process.cwd().
// Tests run the gate from a tmpdir fixture and would otherwise look for
// scripts/tower/index.ts inside that fixture.
const TOWER_CLI = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "index.ts",
);

function stagedLedgerFiles(): string[] {
  try {
    const out = execSync("git diff --cached --name-only --diff-filter=AM", {
      cwd: repo,
      encoding: "utf-8",
    });
    return out
      .split("\n")
      .filter((f) => f.startsWith(".ledger/") && f.endsWith(".yml"));
  } catch {
    return [];
  }
}

function stagedContentAndPrior(
  file: string,
): { stagedMet: boolean; priorMet: boolean } | null {
  try {
    const staged = execSync(`git show :${file}`, {
      cwd: repo,
      encoding: "utf-8",
    });
    let prior = "";
    try {
      prior = execSync(`git show HEAD:${file}`, {
        cwd: repo,
        encoding: "utf-8",
      });
    } catch {
      // File didn't exist before — prior has no acceptance.met.
    }
    const s = YAML.parse(staged);
    const p = prior ? YAML.parse(prior) : null;
    return {
      stagedMet: Boolean(s?.acceptance?.met),
      priorMet: Boolean(p?.acceptance?.met),
    };
  } catch {
    return null;
  }
}

function phaseFromFile(file: string): string | null {
  const m = file.match(/^\.ledger\/(R\d+)-/);
  return m ? m[1] : null;
}

const files = stagedLedgerFiles();
const flipping: Array<{ file: string; phase: string }> = [];

for (const f of files) {
  const state = stagedContentAndPrior(f);
  if (!state) continue;
  if (state.stagedMet && !state.priorMet) {
    const phase = phaseFromFile(f);
    if (phase) flipping.push({ file: f, phase });
  }
}

if (flipping.length === 0) {
  process.exit(0); // No acceptance flips in this commit; nothing to verify.
}

// Run tower verify on each flipping phase (fast checks: tasks + blockers + drift).
// Shell checks (tests/tsc/build/lint) are skipped here — CI owns them.
let failed = false;
for (const { file, phase } of flipping) {
  process.stdout.write(`⊙ acceptance gate — ${phase} (${file})\n`);
  try {
    execSync(
      `npx tsx "${TOWER_CLI}" verify ${phase} --skip-tests --skip-types --skip-build --skip-lint`,
      { cwd: repo, stdio: "inherit" },
    );
  } catch {
    failed = true;
    process.stderr.write(
      `\n✗ ${phase} acceptance.met flipped to true but tower verify failed.\n`,
    );
    process.stderr.write(
      `  Revert the acceptance flip or fix the failing check, then re-commit.\n`,
    );
    process.stderr.write(
      `  (This is the mechanical backstop for the R9-class bypass where\n`,
    );
    process.stderr.write(
      `   autopilot hand-edited the ledger instead of running tower accept.)\n`,
    );
  }
}

process.exit(failed ? 1 : 0);
