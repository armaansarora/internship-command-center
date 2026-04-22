import { Command } from "commander";
import { findRepoRoot } from "../lib/repo.js";
import { taggedCommitsSince } from "../lib/git.js";

export function registerLog(program: Command): void {
  program
    .command("log")
    .description("list R-tagged commits, newest first")
    .option("--since <iso>", "only commits after this ISO timestamp")
    .action(async (opts: { since?: string }) => {
      const repo = await findRepoRoot();
      const commits = await taggedCommitsSince(repo, opts.since);
      if (commits.length === 0) {
        console.log("no R-tagged commits");
        return;
      }
      for (const c of commits) {
        const when = c.committedAt.split("T")[0];
        console.log(
          `${c.sha}  ${when}  [${c.tag.phase}/${c.tag.task}]  ${c.subject}`,
        );
      }
    });
}
