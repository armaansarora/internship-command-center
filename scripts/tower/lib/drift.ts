import { listLedgers, readLedger } from "./ledger.js";
import { taggedCommitsSince, commitExists } from "./git.js";

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

  // Build a set of every task covered by ANY tag on ANY commit. Handles both
  // bundled commits (one commit message carrying `[R4/4.7] [R4/4.8]`) and
  // split commits (two commits tagged `[R6/6.6a]` and `[R6/6.6b]`, both of
  // which normalize to R6.6 via letter-suffix stripping in parseCommitTags).
  const commitTaskIds = new Set<string>();
  for (const c of commits) {
    for (const t of c.tags) commitTaskIds.add(t.task);
  }

  const commitShas = new Set<string>();
  for (const c of commits) commitShas.add(c.sha);

  for (const [phase, led] of ledgers) {
    for (const [taskId, task] of Object.entries(led.tasks)) {
      if (task.status !== "complete") continue;

      // Primary: any commit tag covers this task.
      if (commitTaskIds.has(taskId)) continue;

      // Fallback: the ledger recorded a specific commit SHA for this task and
      // that commit exists in git. Handles the bundling pattern where one
      // commit carries two tasks' work but the subject only has one tag.
      const claimed = task.commit ?? null;
      if (claimed) {
        const claimedShort = claimed.slice(0, 8);
        if (commitShas.has(claimedShort)) continue;
        if (await commitExists(repo, claimed)) continue;
      }

      items.push({
        kind: "ledger_claim_no_commit",
        phase,
        task: taskId,
        detail: `${taskId} marked complete but no [${phase}/${taskId}] tag in git log${
          claimed ? ` and ledger commit ${claimed.slice(0, 8)} not found` : ""
        }`,
      });
    }
  }

  for (const c of commits) {
    for (const t of c.tags) {
      if (!ledgerTaskIds.has(t.task)) {
        items.push({
          kind: "commit_no_ledger_task",
          phase: t.phase,
          task: t.task,
          detail: `commit ${c.sha} tagged [${t.phase}/${t.task}] but no matching ledger task`,
        });
      }
    }
  }

  return { items, scannedAt: new Date().toISOString() };
}
