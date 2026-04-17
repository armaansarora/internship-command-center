import { createClient } from "@/lib/supabase/server";

export type CroRunStatus = "completed" | "failed";

export async function logCroAgentRun(input: {
  userId: string;
  status: CroRunStatus;
  durationMs: number;
  tokensUsed?: number | null;
  errorMessage?: string | null;
  outputSummary?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("agent_logs").insert({
    user_id: input.userId,
    agent: "cro",
    worker: "api/cro",
    action: "chat_completion",
    status: input.status,
    input_summary: null,
    output_summary: input.outputSummary ?? null,
    error: input.errorMessage ?? null,
    tokens_used: input.tokensUsed ?? null,
    duration_ms: input.durationMs,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[cro] agent_logs insert failed:", error.message);
  }
}
