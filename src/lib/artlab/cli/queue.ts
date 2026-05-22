// src/lib/artlab/cli/queue.ts
//
// `artlab queue` — Tower-styled queue inspection. Lists queued runs with
// priority, asset type, request, and age.

import { listQueuedRuns } from "@/lib/artlab/queue/queue";
import { renderQueueView } from "./ui/render";

export interface QueueSubcommandInput {
  workspaceRoot: string;
  log(line: string): void;
}

export interface QueueSubcommandResult { exitCode: number; }

export async function runQueueSubcommand(input: QueueSubcommandInput): Promise<QueueSubcommandResult> {
  const queued = (() => { try { return listQueuedRuns(input.workspaceRoot); } catch { return []; } })();
  input.log(renderQueueView(queued));
  return { exitCode: 0 };
}
