import { createAgentRoute } from "@/lib/agents/create-agent-route";
import { createClient } from "@/lib/supabase/server";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { buildCEOSystemPrompt } from "@/lib/agents/ceo/system-prompt";
import { buildCEOTools } from "@/lib/agents/ceo/tools";

export const maxDuration = 120;

export const POST = createAgentRoute({
  id: "ceo",
  maxDuration,
  loadContext: async ({ user, userName }) => {
    const supabase = await createClient();

    const [stats, logsResult] = await Promise.all([
      getPipelineStatsRest(user.id),
      supabase
        .from("agent_logs")
        .select("agent, action, summary:output_summary, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const departmentMap: Record<string, { summary: string; lastActive: string }> = {};
    for (const entry of logsResult.data ?? []) {
      const agent = (entry.agent as string | null) ?? "unknown";
      if (departmentMap[agent]) continue;
      departmentMap[agent] = {
        summary:
          (entry.summary as string | null) ??
          (entry.action as string | null) ??
          "Active",
        lastActive: entry.created_at as string,
      };
    }

    const agentSummaries = Object.entries(departmentMap).map(([dept, info]) => ({
      department: dept,
      summary: info.summary,
      lastActive: info.lastActive,
    }));

    return {
      systemPrompt: buildCEOSystemPrompt(stats, userName, [], agentSummaries),
      tools: buildCEOTools(user.id),
    };
  },
});
