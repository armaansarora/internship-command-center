import { listLedgers, readLedger } from "./ledger.js";
import { taggedCommitsSince } from "./git.js";

export interface DriftItem {
  kind:
    | "ledger_claim_no_commit"
    | "commit_no_ledger_task"
    | "acceptance_check_failed";
  phase: string;
  task?: string;
  detail: string;
}

export interface DriftReport {
  items: DriftItem[];
  scannedAt: string;
}

export async function detectDrift(repo: string): Promise<DriftReport> {
  const items: DriftItem[] = [];
  const phases = await listLedgers(repo);
  const ledgers = new Map<string, Awaited<ReturnType<typeof readLedger>>>();
  const ledgerTaskIds = new Set<string>();

  for (const p of phases) {
    const led = await readLedger(repo, p);
    ledgers.set(p, led);
    for (const t of Object.keys(led.tasks)) ledgerTaskIds.add(t);
  }

  const commits = await taggedCommitsSince(repo);
  const commitTaskIds = new Set(commits.map((c) => c.tag.task));

  for (const [phase, led] of ledgers) {
    for (const [taskId, task] of Object.entries(led.tasks)) {
      if (task.status === "complete" && !commitTaskIds.has(taskId)) {
        items.push({
          kind: "ledger_claim_no_commit",
          phase,
          task: taskId,
          detail: `${taskId} marked complete but no [${phase}/${taskId}] tag in git log`,
        });
      }
    }
  }

  for (const c of commits) {
    if (!ledgerTaskIds.has(c.tag.task)) {
      items.push({
        kind: "commit_no_ledger_task",
        phase: c.tag.phase,
        task: c.tag.task,
        detail: `commit ${c.sha} tagged [${c.tag.phase}/${c.tag.task}] but no matching ledger task`,
      });
    }
  }

  return { items, scannedAt: new Date().toISOString() };
}
