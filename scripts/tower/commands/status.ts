import { Command } from "commander";
import { findRepoRoot } from "../lib/repo.js";
import { listLedgers, readLedger } from "../lib/ledger.js";
import { readRepoHead, taggedCommitsSince } from "../lib/git.js";

export function registerStatus(program: Command): void {
  program
    .command("status")
    .description("current phase, progress, last commit, blockers, lock, drift")
    .action(async () => {
      const repo = await findRepoRoot();
      const phases = await listLedgers(repo);
      if (phases.length === 0) {
        console.log(
          "TOWER STATUS\n  no phases in ledger — run `tower init`",
        );
        return;
      }
      const active = await pickActive(repo, phases);
      const led = await readLedger(repo, active);
      const total = Object.keys(led.tasks).length;
      const done = Object.values(led.tasks).filter(
        (t) => t.status === "complete",
      ).length;
      const openBlockers = led.blockers.filter((b) => !b.resolved);

      const tagged = await taggedCommitsSince(repo);
      const lastTagged = tagged[0];
      const head = await readRepoHead(repo);

      const lines = ["TOWER STATUS"];
      lines.push(`  Phase:        ${active} — ${led.name}`);
      lines.push(`  Progress:     ${done}/${total} tasks complete`);
      if (lastTagged) {
        lines.push(
          `  Last commit:  ${lastTagged.sha} [${lastTagged.tag.phase}/${lastTagged.tag.task}] ${lastTagged.subject}`,
        );
      } else {
        lines.push(`  Last commit:  ${head.sha} ${head.subject} (untagged)`);
      }
      lines.push(`  Blockers:     ${openBlockers.length} open`);
      if (led.lock) {
        lines.push(
          `  Lock:         held by ${led.lock.holder} (expires ${led.lock.expires})`,
        );
      } else {
        lines.push(`  Lock:         none`);
      }
      console.log(lines.join("\n"));
    });
}

async function pickActive(repo: string, phases: string[]): Promise<string> {
  for (const p of phases) {
    const led = await readLedger(repo, p);
    if (led.status === "in_progress") return p;
  }
  for (const p of phases) {
    const led = await readLedger(repo, p);
    if (led.status === "not_started") return p;
  }
  return phases[0];
}
