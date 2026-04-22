import { Command } from "commander";
import { findRepoRoot } from "../lib/repo.js";
import { listLedgers, readLedger } from "../lib/ledger.js";

export function registerPhases(program: Command): void {
  program
    .command("phases")
    .description("list all phases with status and task progress")
    .action(async () => {
      const repo = await findRepoRoot();
      const phases = await listLedgers(repo);
      if (phases.length === 0) {
        console.log("no phases in ledger — run `tower init`");
        return;
      }
      phases.sort();
      const rows: string[] = [];
      for (const p of phases) {
        const led = await readLedger(repo, p);
        const total = Object.keys(led.tasks).length;
        const done = Object.values(led.tasks).filter(
          (t) => t.status === "complete",
        ).length;
        rows.push(
          `${p.padEnd(4)} ${led.name.padEnd(24)} ${led.status.padEnd(13)} ${done}/${total}`,
        );
      }
      console.log(rows.join("\n"));
    });
}
