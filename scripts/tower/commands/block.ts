import { Command } from "commander";
import YAML from "yaml";
import { findRepoRoot } from "../lib/repo.js";
import { readLedger, writeLedger } from "../lib/ledger.js";
import { pushUndo } from "../lib/undo.js";

export function registerBlock(program: Command): void {
  program
    .command("block <taskId> <text>")
    .description("record a blocker on a task")
    .action(async (taskId: string, text: string) => {
      const repo = await findRepoRoot();
      const phase = taskId.split(".")[0];
      const led = await readLedger(repo, phase).catch(() => null);
      if (!led || !led.tasks[taskId]) {
        console.error(`task ${taskId} not found`);
        process.exit(1);
      }
      await pushUndo(repo, {
        op: "block",
        phase,
        snapshot: YAML.stringify(led),
      });
      const nextId = `B${led.blockers.length + 1}`;
      const now = new Date().toISOString();
      led.blockers.push({
        id: nextId,
        task: taskId,
        opened: now,
        text,
        resolved: null,
      });
      led.history.push({ [now]: `blocker_opened ${nextId}` });
      await writeLedger(repo, led);
      console.log(`blocker ${nextId} recorded on ${taskId}`);
    });

  program
    .command("unblock <phase> <blockerId>")
    .description("mark a blocker resolved")
    .action(async (phase: string, blockerId: string) => {
      const repo = await findRepoRoot();
      const led = await readLedger(repo, phase);
      const b = led.blockers.find((x) => x.id === blockerId);
      if (!b) {
        console.error(`blocker ${blockerId} not found in ${phase}`);
        process.exit(1);
      }
      await pushUndo(repo, {
        op: "unblock",
        phase,
        snapshot: YAML.stringify(led),
      });
      b.resolved = new Date().toISOString();
      led.history.push({ [b.resolved]: `blocker_resolved ${blockerId}` });
      await writeLedger(repo, led);
      console.log(`blocker ${blockerId} resolved`);
    });
}
