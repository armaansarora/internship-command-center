import { streamText, stepCountIs, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { requireUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { requireAgentAccess } from "@/lib/stripe/agent-access";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { buildCEOSystemPrompt } from "@/lib/agents/ceo/system-prompt";
import { buildCEOTools } from "@/lib/agents/ceo/tools";

export const maxDuration = 120;

export async function POST(req: Request): Promise<Response> {
  const user = await requireUser();

  const accessResponse = await requireAgentAccess(user.id);
  if (accessResponse) return accessResponse;

  const check = await withRateLimit(user.id);
  if (check.response) return check.response;

  const body = (await req.json()) as { messages: UIMessage[] };
  const { messages } = body;

  // Fetch full pipeline stats via Supabase REST (Vercel-safe)
  const stats = await getPipelineStatsRest(user.id);

  // Derive display name from email or metadata
  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Analyst";

  // Fetch recent agent logs for department summaries
  const supabase = await createClient();
  const { data: recentLogs } = await supabase
    .from("agent_logs")
    .select("agent, action, summary:output_summary, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  // Build per-department summaries from logs
  const departmentMap: Record<string, { summary: string; lastActive: string }> = {};
  for (const log of recentLogs ?? []) {
    const agent = (log.agent as string) ?? "unknown";
    if (!departmentMap[agent]) {
      departmentMap[agent] = {
        summary: (log.summary as string) ?? (log.action as string) ?? "Active",
        lastActive: log.created_at as string,
      };
    }
  }

  const agentSummaries = Object.entries(departmentMap).map(([dept, info]) => ({
    department: dept,
    summary: info.summary,
    lastActive: info.lastActive,
  }));

  // Fetch unread notification count for context
  const { count: notifCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  // Inject notification count into the first message context if present
  const notifNote =
    (notifCount ?? 0) > 0
      ? `(${notifCount} unread notification${notifCount !== 1 ? "s" : ""})`
      : "";
  void notifNote; // Available for future use in dynamic context

  const systemPrompt = buildCEOSystemPrompt(stats, userName, [], agentSummaries);

  const tools = buildCEOTools(user.id);

  const modelMessages = await convertToModelMessages(
    messages as Array<Omit<UIMessage, "id">>
  );

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
