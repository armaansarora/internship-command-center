/**
 * Telemetry sink for AI calls.
 *
 * Every `streamText`/`generateText` invocation in the AI tree should pipe its
 * `onFinish` payload through {@link recordAgentRun}. Writes a row into
 * `agent_logs` with token + cost + duration so the CFO Observatory floor can
 * surface real spend numbers.
 *
 * This must NOT throw — telemetry failure must never block a user-facing chat
 * response. We swallow errors and emit them via the structured logger only.
 */

import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";
import { computeCostCents } from "./cost";
import type { LanguageModelUsage } from "ai";

interface RecordAgentRunInput {
  /** Owning user (RLS-scoped). */
  userId: string;
  /** Lower-case agent key — must match `agentLogs.agent` for CFO aggregation. */
  agent: string;
  /** Action label; doubles as a human-readable tag. */
  action: string;
  /** Canonical model identifier (matches keys in RATES table). */
  modelId: string;
  /** Token usage from the SDK callback. */
  usage: LanguageModelUsage | undefined;
  /** Wall-clock duration of the LLM call in ms. */
  durationMs: number;
  /** Compressed input snippet (truncated server-side to 500 chars). */
  inputSummary?: string | null;
  /** Compressed output snippet (truncated server-side to 500 chars). */
  outputSummary?: string | null;
  /** Optional error string when the call failed. */
  error?: string | null;
  /** Status — defaults to 'completed'; pass 'failed' on error. */
  status?: "running" | "completed" | "failed" | "cancelled";
}

const SUMMARY_LIMIT = 500;

function truncate(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/**
 * Write one row to `agent_logs`. Fire-and-forget (never throws); failures are
 * logged at warn level only.
 */
export async function recordAgentRun(input: RecordAgentRunInput): Promise<void> {
  try {
    const supabase = await createClient();
    const costCents = computeCostCents(input.modelId, input.usage);
    const totalTokens =
      (input.usage?.inputTokens ?? 0) + (input.usage?.outputTokens ?? 0);

    const { error } = await supabase.from("agent_logs").insert({
      user_id: input.userId,
      agent: input.agent,
      // `action` is text, free-form. We pack the model id in here so cost
      // reports can disaggregate by model when we eventually multi-source.
      action: `${input.action}@${input.modelId}`,
      status: input.status ?? "completed",
      input_summary: truncate(input.inputSummary, SUMMARY_LIMIT),
      output_summary: truncate(input.outputSummary, SUMMARY_LIMIT),
      error: input.error ?? null,
      tokens_used: totalTokens > 0 ? totalTokens : null,
      // numeric(10, 2) — Supabase REST accepts both number and string. We
      // pass the raw number rounded to 2dp and let PostgREST coerce.
      cost_cents: costCents,
      duration_ms: Math.round(input.durationMs),
      completed_at: new Date().toISOString(),
    });

    if (error) {
      log.warn("agent_logs.insert_failed", {
        agent: input.agent,
        error: error.message,
      });
    }
  } catch (err) {
    log.warn("agent_logs.insert_threw", {
      agent: input.agent,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
