import { Command } from "commander";
import fs from "fs-extra";
import path from "node:path";
import { findRepoRoot } from "../lib/repo.js";
import { detectDrift } from "../lib/drift.js";

export function registerDiff(program: Command): void {
  program
    .command("diff")
    .alias("verify")
    .description("drift report: ledger vs git log")
    .option("--strict", "exit non-zero if drift found")
    .action(async (opts: { strict?: boolean }) => {
      const repo = await findRepoRoot();
      const report = await detectDrift(repo);
      const cacheDir = path.join(repo, ".tower/.cache");
      await fs.ensureDir(cacheDir);
      await fs.writeJson(path.join(cacheDir, "drift.json"), report, {
        spaces: 2,
      });

      if (report.items.length === 0) {
        console.log("drift: clean");
        return;
      }
      console.log(
        `⚠ drift (${report.items.length} item${
          report.items.length === 1 ? "" : "s"
        }):`,
      );
      for (const item of report.items) {
        console.log(`  ${item.detail}`);
      }
      if (opts.strict) process.exit(1);
    });
}
