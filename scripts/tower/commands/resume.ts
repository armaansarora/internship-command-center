import { Command } from "commander";
import fs from "fs-extra";
import { findRepoRoot } from "../lib/repo.js";
import { findLatestHandoff } from "../lib/handoff.js";

export function registerResume(program: Command): void {
  program
    .command("resume")
    .description("print the latest session handoff packet")
    .action(async () => {
      const repo = await findRepoRoot();
      const latest = await findLatestHandoff(repo);
      if (!latest) {
        console.log("no handoff packets yet — nothing to resume from");
        return;
      }
      const content = await fs.readFile(latest, "utf-8");
      console.log(content);
    });
}
