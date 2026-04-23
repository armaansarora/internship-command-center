/**
 * Agent Dispatches queries via Supabase REST.
 *
 * Each row is one CEO→subagent dispatch inside a single bell-ring turn.
 * Rows sharing a `request_id` form a fan-out tree: the orchestrator walks
 * the tree on completion to aggregate summaries + tokens for the user.
 *
 * Lifecycle helpers mirror the four status transitions:
 *   queued  → insertQueuedDispatch
 *   running → markDispatchRunning
 *   done    → completeDispatch
 *   failed  → failDispatch
 *
 * All timestamps that represent "when the client acted" are written as
 * ISO strings from the calling side — keeps them deterministic under test
 * and consistent with how we stamp other per-user tables (e.g. notifications).
 */

import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentDispatchRow {
  id: string;
  user_id: string;
  request_id: string;
  parent_dispatch_id: string | null;
  agent: string;
  depends_on: string[];
  task: string;
  status: "queued" | "running" | "completed" | "failed";
  summary: string | null;
  tokens_used: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Insert a new queued dispatch row and return its id.
 * Returns an empty string on failure — callers should treat "" as a missed
 * write and skip any follow-up status updates.
 */
export async function insertQueuedDispatch(
  userId: string,
  requestId: string,
  agent: string,
  task: string,
  dependsOn: string[] = [],
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agent_dispatches")
    .insert({
      user_id: userId,
      request_id: requestId,
      agent,
      task,
      depends_on: dependsOn,
      status: "queued",
    })
    .select("id")
    .single();

  if (error) {
    log.error("agent_dispatches.insert_failed", undefined, {
      userId,
      requestId,
      agent,
      error: error.message,
    });
    return "";
  }

  return (data as { id: string }).id;
}

/**
 * Flip a dispatch from queued → running and stamp started_at.
 */
export async function markDispatchRunning(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("agent_dispatches")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    log.error("agent_dispatches.mark_running_failed", undefined, {
      id,
      error: error.message,
    });
  }
}

/**
 * Complete a dispatch — write summary + token usage and stamp completed_at.
 */
export async function completeDispatch(
  id: string,
  summary: string,
  tokensUsed: number,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("agent_dispatches")
    .update({
      status: "completed",
      summary,
      tokens_used: tokensUsed,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    log.error("agent_dispatches.complete_failed", undefined, {
      id,
      error: error.message,
    });
  }
}

/**
 * Mark a dispatch as failed — summary carries the error message so the
 * orchestrator can surface it to the user without re-reading a stack trace.
 */
export async function failDispatch(
  id: string,
  errorSummary: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("agent_dispatches")
    .update({
      status: "failed",
      summary: errorSummary,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    log.error("agent_dispatches.fail_failed", undefined, {
      id,
      error: error.message,
    });
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch every dispatch for a given request (one bell-ring).
 * Ordered by started_at ascending; rows still queued (started_at null)
 * surface last so the caller can render the execution sequence cleanly.
 */
export async function getDispatchesForRequest(
  userId: string,
  requestId: string,
): Promise<AgentDispatchRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agent_dispatches")
    .select("*")
    .eq("user_id", userId)
    .eq("request_id", requestId)
    .order("started_at", { ascending: true, nullsFirst: false });

  if (error) {
    log.error("agent_dispatches.get_for_request_failed", undefined, {
      userId,
      requestId,
      error: error.message,
    });
    return [];
  }

  return (data ?? []) as AgentDispatchRow[];
}
