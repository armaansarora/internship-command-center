import { Command } from "commander";
import { findRepoRoot } from "../lib/repo.js";
import { readAutopilot, lintAutopilotState } from "../lib/autopilot.js";

export function registerLintAutopilot(program: Command): void {
  program
    .command("lint-autopilot")
    .description(
      "check .tower/autopilot.yml for semantic issues (timestamp ordering, scope format, etc.)",
    )
    .option("--strict", "exit non-zero if any issues found")
    .action(async (opts: { strict?: boolean }) => {
      const repo = await findRepoRoot();
      const state = await readAutopilot(repo);
      if (!state) {
        console.log("no .tower/autopilot.yml — nothing to lint");
        return;
      }
      const issues = lintAutopilotState(state);
      if (issues.length === 0) {
        console.log("autopilot state: clean");
        return;
      }
      console.log(
        `⚠ autopilot state issues (${issues.length}):`,
      );
      for (const i of issues) {
        console.log(`  ${i.field.padEnd(14)} ${i.message}`);
      }
      if (opts.strict) process.exit(1);
    });
}
