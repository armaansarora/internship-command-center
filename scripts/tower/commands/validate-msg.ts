import { Command } from "commander";
import fs from "fs-extra";
import path from "node:path";
import { execa } from "execa";
import { findRepoRoot } from "../lib/repo.js";
import { listLedgers, readLedger } from "../lib/ledger.js";
import { parseCommitTags } from "../lib/git.js";

export function registerValidateMsg(program: Command): void {
  program
    .command("validate-msg <msgFile>")
    .description(
      "validate commit message — warn on untagged src commits and unknown tags",
    )
    .action(async (msgFile: string) => {
      const repo = await findRepoRoot();
      const msgPath = path.isAbsolute(msgFile)
        ? msgFile
        : path.join(repo, msgFile);
      const msg = (await fs.readFile(msgPath, "utf-8")).trim();
      const tags = parseCommitTags(msg);

      if (tags.length === 0) {
        const { stdout } = await execa(
          "git",
          ["diff", "--cached", "--name-only"],
          { cwd: repo },
        );
        const touchesSrc = stdout
          .split("\n")
          .some((f) => f.startsWith("src/"));
        if (touchesSrc) {
          console.error(
            "⚠ untagged commit touches src/ — did you forget the phase tag [Rn/n.n]?",
          );
        }
        return;
      }

      const phases = await listLedgers(repo);
      const knownTasks = new Set<string>();
      for (const p of phases) {
        const led = await readLedger(repo, p);
        for (const t of Object.keys(led.tasks)) knownTasks.add(t);
      }
      for (const t of tags) {
        if (!knownTasks.has(t.task)) {
          console.error(
            `⚠ tag [${t.phase}/${t.task}] not in ledger — consider \`tower adopt\` or add the task`,
          );
        }
      }
    });
}
