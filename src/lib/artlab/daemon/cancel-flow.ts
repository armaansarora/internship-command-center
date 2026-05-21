// src/lib/artlab/daemon/cancel-flow.ts
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { Supervisor } from "./supervisor";

export const CANCEL_GRACE_MS = 30_000;

export interface CancelFlowInput {
  workspaceRoot: string;
  supervisor: Supervisor;
  kill?: (pid: number, signal: NodeJS.Signals) => boolean;
}

export interface CancelFlowResult {
  signaled: string[];
  orphaned: string[];
}

export async function processCancelIntents(input: CancelFlowInput): Promise<CancelFlowResult> {
  const inboxDir = join(input.workspaceRoot, "inbox");
  if (!existsSync(inboxDir)) return { signaled: [], orphaned: [] };
  const result: CancelFlowResult = { signaled: [], orphaned: [] };
  const killFn = input.kill ?? ((pid, sig) => { process.kill(pid, sig); return true; });
  for (const file of readdirSync(inboxDir).filter((f) => f.startsWith("cancel-") && f.endsWith(".json"))) {
    const path = join(inboxDir, file);
    let parsed: { runId?: string } = {};
    try { parsed = JSON.parse(readFileSync(path, "utf8")) as { runId?: string }; } catch { /* skip malformed */ }
    if (!parsed.runId) { unlinkSync(path); continue; }
    const child = input.supervisor.findChildByRunId(parsed.runId);
    if (child) {
      try { killFn(child.pid, "SIGTERM"); result.signaled.push(parsed.runId); }
      catch { /* child may have just exited */ }
    } else {
      result.orphaned.push(parsed.runId);
    }
    unlinkSync(path);
  }
  return result;
}
