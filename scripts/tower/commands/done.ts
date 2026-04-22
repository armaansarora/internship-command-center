import { Command } from "commander";
import YAML from "yaml";
import { findRepoRoot } from "../lib/repo.js";
import { readLedger, writeLedger } from "../lib/ledger.js";
import { readRepoHead } from "../lib/git.js";
import { pushUndo } from "../lib/undo.js";

export function registerDone(program: Command): void {
  program
    .command("done <taskId>")
    .description("mark a task complete; records HEAD sha as commit ref")
    .action(async (taskId: string) => {
      const repo = await findRepoRoot();
      const phase = taskId.split(".")[0];
      const led = await readLedger(repo, phase).catch(() => null);
      if (!led || !led.tasks[taskId]) {
        console.error(`task ${taskId} not found`);
        process.exit(1);
      }
      await pushUndo(repo, {
        op: "done",
        phase,
        snapshot: YAML.stringify(led),
      });
      const head = await readRepoHead(repo);
      const now = new Date().toISOString();
      led.tasks[taskId].status = "complete";
      led.tasks[taskId].completed = now;
      led.tasks[taskId].commit = head.sha;
      led.history.push({ [now]: `task_completed ${taskId}` });

      const allDone = Object.values(led.tasks).every(
        (t) => t.status === "complete",
      );
      if (allDone && Object.keys(led.tasks).length > 0) {
        led.status = "complete";
        led.completed = now;
        led.history.push({ [now]: `phase_completed` });
      }
      await writeLedger(repo, led);
      console.log(`${taskId} → complete (commit ${head.sha})`);
    });
}
