import { Command } from "commander";
import { findRepoRoot } from "../lib/repo.js";
import { listLedgers, readLedger } from "../lib/ledger.js";

export function registerBlocked(program: Command): void {
  program
    .command("blocked")
    .description("list unresolved blockers across all phases")
    .action(async () => {
      const repo = await findRepoRoot();
      const phases = await listLedgers(repo);
      const rows: string[] = [];
      for (const p of phases) {
        const led = await readLedger(repo, p);
        for (const b of led.blockers) {
          if (b.resolved) continue;
          rows.push(`${p} · ${b.id} · ${b.task} · ${b.text}`);
        }
      }
      console.log(rows.length ? rows.join("\n") : "no open blockers");
    });
}
