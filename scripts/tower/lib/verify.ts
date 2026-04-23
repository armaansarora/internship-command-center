import { execa } from "execa";
import { listLedgers, readLedger } from "./ledger.js";
import { detectDrift } from "./drift.js";

export interface CheckResult {
  name: string;
  ok: boolean;
  message: string;
  detail?: string;
}

export interface VerifyReport {
  phase: string | null;
  checks: CheckResult[];
  ok: boolean;
}

export interface VerifyOptions {
  phase?: string;
  skipTests?: boolean;
  skipTypes?: boolean;
  skipBuild?: boolean;
  skipLint?: boolean;
  skipDrift?: boolean;
  strict?: boolean;
}

export async function runVerify(
  repo: string,
  opts: VerifyOptions = {},
): Promise<VerifyReport> {
  const checks: CheckResult[] = [];
  const phase = opts.phase ?? (await pickActivePhase(repo));

  if (phase) {
    try {
      const led = await readLedger(repo, phase);
      const total = Object.keys(led.tasks).length;
      const done = Object.values(led.tasks).filter(
        (t) => t.status === "complete",
      ).length;
      const open = led.blockers.filter((b) => !b.resolved).length;

      checks.push({
        name: `${phase} tasks`,
        ok: total > 0 && done === total,
        message:
          total > 0
            ? done === total
              ? `✓ ${done}/${total} complete`
              : `✗ ${done}/${total} complete`
            : "⚠ no tasks defined",
      });
      checks.push({
        name: "Blockers",
        ok: open === 0,
        message: open === 0 ? "✓ 0 open" : `✗ ${open} open`,
      });
    } catch (err) {
      checks.push({
        name: `${phase} ledger`,
        ok: false,
        message: `✗ ${(err as Error).message}`,
      });
    }
  }

  if (!opts.skipDrift) {
    const drift = await detectDrift(repo);
    checks.push({
      name: "Drift",
      ok: drift.items.length === 0,
      message:
        drift.items.length === 0
          ? "✓ clean"
          : `✗ ${drift.items.length} item${drift.items.length === 1 ? "" : "s"}`,
      detail: drift.items.map((i) => i.detail).join("\n"),
    });
  }

  if (!opts.skipTests) {
    checks.push(await runShellCheck(repo, "Tests", "npm", ["test"]));
  }

  if (!opts.skipTypes) {
    checks.push(
      await runShellCheck(repo, "TypeScript", "npx", ["tsc", "--noEmit"]),
    );
  }

  if (!opts.skipBuild) {
    checks.push(
      await runShellCheck(repo, "Build", "npm", ["run", "build"]),
    );
  }

  if (!opts.skipLint) {
    checks.push(await runLintCheck(repo, opts.strict));
  }

  // Phase-specific acceptance script — if scripts/r{N}-acceptance-check.ts
  // exists for the phase being verified, run it.  Mirrors R7's pattern:
  // the 4-gate verifies the generic build health; the phase script
  // verifies Intent-level invariants that the 4-gate can't see.
  if (phase) {
    const phaseCheck = await runPhaseAcceptanceScript(repo, phase);
    if (phaseCheck) checks.push(phaseCheck);
  }

  const ok = checks.every((c) => c.ok);
  return { phase, checks, ok };
}

async function runPhaseAcceptanceScript(
  repo: string,
  phase: string,
): Promise<CheckResult | null> {
  const match = phase.match(/^R(\d+)/i);
  if (!match) return null;
  const n = match[1];
  const scriptRel = `scripts/r${n}-acceptance-check.ts`;
  const scriptPath = `${repo}/${scriptRel}`;
  // Check existence without fs import bloat — use Node's own mechanism.
  const { existsSync } = await import("node:fs");
  if (!existsSync(scriptPath)) return null;

  try {
    const result = await execa("npx", ["tsx", scriptRel], {
      cwd: repo,
      reject: false,
    });
    if (result.exitCode === 0) {
      return {
        name: `${phase} acceptance`,
        ok: true,
        message: "✓ invariants green",
      };
    }
    const detail = ((result.stdout as string) || (result.stderr as string) || "")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .slice(-10)
      .join("\n");
    return {
      name: `${phase} acceptance`,
      ok: false,
      message: `✗ failed (exit ${result.exitCode})`,
      detail,
    };
  } catch (err) {
    return {
      name: `${phase} acceptance`,
      ok: false,
      message: `✗ ${(err as Error).message}`,
    };
  }
}

async function pickActivePhase(repo: string): Promise<string | null> {
  const phases = await listLedgers(repo);
  for (const p of phases) {
    const led = await readLedger(repo, p);
    if (led.status === "in_progress") return p;
  }
  return phases[0] ?? null;
}

async function runShellCheck(
  repo: string,
  name: string,
  cmd: string,
  args: string[],
): Promise<CheckResult> {
  try {
    const result = await execa(cmd, args, { cwd: repo, reject: false });
    if (result.exitCode === 0) {
      return { name, ok: true, message: "✓ green" };
    }
    const detail = ((result.stderr as string) || (result.stdout as string) || "")
      .split("\n")
      .slice(0, 3)
      .join("\n");
    return {
      name,
      ok: false,
      message: `✗ failed (exit ${result.exitCode})`,
      detail,
    };
  } catch (err) {
    return {
      name,
      ok: false,
      message: `✗ ${(err as Error).message}`,
    };
  }
}

async function runLintCheck(
  repo: string,
  strict?: boolean,
): Promise<CheckResult> {
  try {
    const result = await execa("npm", ["run", "lint"], {
      cwd: repo,
      reject: false,
    });
    const out = `${result.stdout}\n${result.stderr}`;
    const m = out.match(/(\d+)\s+problems?\s+\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/);
    if (!m) {
      return {
        name: "Lint",
        ok: result.exitCode === 0,
        message: result.exitCode === 0 ? "✓ clean" : "⚠ eslint exited non-zero but no summary found",
      };
    }
    const errors = parseInt(m[2], 10);
    if (strict) {
      return {
        name: "Lint",
        ok: errors === 0,
        message: errors === 0 ? "✓ 0 errors" : `✗ ${errors} errors`,
      };
    }
    // Informational by default — never blocks unless --strict.
    return {
      name: "Lint",
      ok: true,
      message: `⚠ ${m[1]} problems (${m[2]} errors, ${m[3]} warnings) — baseline informational; --strict to fail`,
    };
  } catch (err) {
    return {
      name: "Lint",
      ok: false,
      message: `✗ ${(err as Error).message}`,
    };
  }
}
