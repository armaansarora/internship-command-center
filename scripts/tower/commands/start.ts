import { Command } from "commander";
import YAML from "yaml";
import { findRepoRoot } from "../lib/repo.js";
import { loadConfig } from "../lib/config.js";
import { readLedger, writeLedger } from "../lib/ledger.js";
import { acquireLock } from "../lib/lock.js";
import { getSessionId } from "../lib/session.js";
import { pushUndo } from "../lib/undo.js";

export function registerStart(program: Command): void {
  program
    .command("start <taskId>")
    .description("mark a task in_progress, acquire phase lock")
    .action(async (taskId: string) => {
      const repo = await findRepoRoot();
      const cfg = await loadConfig(repo);
      const phase = taskId.split(".")[0];
      const led = await readLedger(repo, phase).catch(() => null);
      if (!led) {
        console.error(`no ledger for phase ${phase}`);
        process.exit(1);
      }
      if (!led.tasks[taskId]) {
        console.error(`task ${taskId} not found in ${phase}`);
        process.exit(1);
      }
      const sess = getSessionId();
      const lock = await acquireLock(
        repo,
        phase,
        sess,
        cfg.lockTtlMinutes,
      );
      if (!lock.acquired) {
        console.error(
          `${phase} held by ${lock.heldBy} until ${lock.expires}. Use \`tower lock ${phase} --force\` to steal.`,
        );
        process.exit(1);
      }
      await pushUndo(repo, {
        op: "start",
        phase,
        snapshot: YAML.stringify(led),
      });
      const now = new Date().toISOString();
      led.tasks[taskId].status = "in_progress";
      led.tasks[taskId].started = now;
      if (led.status === "not_started") {
        led.status = "in_progress";
        led.started = now;
      }
      led.history.push({ [now]: `task_started ${taskId}` });
      led.lock = { holder: sess, acquired: now, expires: lock.expires! };
      await writeLedger(repo, led);
      console.log(`${taskId} → in_progress`);
    });
}
