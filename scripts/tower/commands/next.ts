import { Command } from "commander";
import { findRepoRoot } from "../lib/repo.js";
import { listLedgers, readLedger } from "../lib/ledger.js";

export function registerNext(program: Command): void {
  program
    .command("next")
    .description("which task to work on next, with blocker context")
    .action(async () => {
      const repo = await findRepoRoot();
      const phases = await listLedgers(repo);
      phases.sort();
      for (const phase of phases) {
        const led = await readLedger(repo, phase);
        if (led.status === "complete") continue;
        const inProgress = Object.entries(led.tasks).find(
          ([, t]) => t.status === "in_progress",
        );
        if (inProgress) {
          printTask(phase, led, inProgress[0]);
          return;
        }
        const notStarted = Object.entries(led.tasks).find(
          ([, t]) => t.status === "not_started",
        );
        if (notStarted) {
          printTask(phase, led, notStarted[0]);
          return;
        }
      }
      console.log("all phases complete");
    });
}

function printTask(
  phase: string,
  led: Awaited<ReturnType<typeof readLedger>>,
  taskId: string,
): void {
  const task = led.tasks[taskId];
  const blockers = led.blockers.filter(
    (b) => b.task === taskId && !b.resolved,
  );
  console.log(`${taskId} — ${task.title}`);
  if (blockers.length > 0) {
    console.log("  blockers:");
    for (const b of blockers) console.log(`    ${b.id}: ${b.text}`);
  }
  if (Object.values(led.tasks).every((t) => t.status === "complete")) {
    console.log(`  (${phase} phase complete)`);
  }
}
