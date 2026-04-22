import { Command } from "commander";
import YAML from "yaml";
import { findRepoRoot } from "../lib/repo.js";
import { popUndo } from "../lib/undo.js";
import { LedgerSchema } from "../lib/ledger-schema.js";
import { writeLedger } from "../lib/ledger.js";

export function registerUndo(program: Command): void {
  program
    .command("undo")
    .description("revert the last state mutation")
    .action(async () => {
      const repo = await findRepoRoot();
      const entry = await popUndo(repo);
      if (!entry) {
        console.error("nothing to undo");
        process.exit(1);
      }
      const parsed = LedgerSchema.parse(YAML.parse(entry.snapshot));
      await writeLedger(repo, parsed);
      console.log(`undid ${entry.op} on ${entry.phase}`);
    });
}
