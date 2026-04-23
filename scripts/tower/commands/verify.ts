import { Command } from "commander";
import { findRepoRoot } from "../lib/repo.js";
import { runVerify, type VerifyOptions } from "../lib/verify.js";

export function registerVerify(program: Command): void {
  program
    .command("verify [phase]")
    .description(
      "full acceptance check — tasks, blockers, drift, tests, tsc, build, lint",
    )
    .option("--skip-tests", "skip vitest")
    .option("--skip-types", "skip tsc --noEmit")
    .option("--skip-build", "skip npm run build")
    .option("--skip-lint", "skip eslint")
    .option("--skip-drift", "skip ledger/git reconciliation")
    .option(
      "--strict",
      "fail on any lint errors (default: lint is informational)",
    )
    .action(async (phase: string | undefined, opts: VerifyOptions) => {
      const repo = await findRepoRoot();
      const report = await runVerify(repo, { ...opts, phase });
      console.log(`\n${report.phase ? `VERIFY ${report.phase}` : "VERIFY"}`);
      for (const c of report.checks) {
        console.log(`  ${c.name.padEnd(14)} ${c.message}`);
        if (c.detail) {
          console.log(
            c.detail
              .split("\n")
              .map((l) => `    ${l}`)
              .join("\n"),
          );
        }
      }
      console.log();
      if (report.ok) {
        console.log(
          `✓ verifies cleanly${
            report.phase
              ? ` — safe to mark ${report.phase} acceptance.met: true`
              : ""
          }`,
        );
      } else {
        console.log(
          `✗ verification failed — fix the ✗ items before marking acceptance`,
        );
        process.exit(1);
      }
    });
}
