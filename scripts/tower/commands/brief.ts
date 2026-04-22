import { Command } from "commander";
import path from "node:path";
import fs from "fs-extra";
import { findRepoRoot } from "../lib/repo.js";
import { loadConfig } from "../lib/config.js";
import { extractBrief } from "../lib/roadmap.js";

export function registerBrief(program: Command): void {
  program
    .command("brief <phase>")
    .description("print a single phase brief from the roadmap")
    .action(async (phase: string) => {
      const repo = await findRepoRoot();
      const cfg = await loadConfig(repo);
      const p = path.join(repo, cfg.roadmapPath);
      if (!(await fs.pathExists(p))) {
        console.error(`roadmap not found at ${cfg.roadmapPath}`);
        process.exit(1);
      }
      const raw = await fs.readFile(p, "utf-8");
      try {
        console.log(extractBrief(raw, phase));
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });
}
