import { createAgentRouteHandler } from "@/lib/ai/agents/shared-route-handler";
import { createClient } from "@/lib/supabase/server";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";
import { buildCEOSystemPrompt } from "@/lib/agents/ceo/system-prompt";
import { buildCEOTools } from "@/lib/agents/ceo/tools";
import { buildCEODispatchTools } from "@/lib/ai/agents/ceo-orchestrator";

export const maxDuration = 120;

interface AgentSummary {
  department: string;
  summary: string;
  lastActive: string;
}

interface CEOContext {
  stats: PipelineStats;
  agentSummaries: AgentSummary[];
}

export const POST = createAgentRouteHandler<CEOContext>({
  agentKey: "ceo",
  async loadContext(user) {
    const supabase = await createClient();

    const [stats, recentLogs] = await Promise.all([
      getPipelineStatsRest(user.id),
      supabase
        .from("agent_logs")
        .select("agent, action, output_summary, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    // Build per-department summaries from logs (most recent per agent wins).
    // We filter out the CEO's own logs because the briefing is meant to show
    // OTHER departments' recent activity.
    const departmentMap: Record<string, { summary: string; lastActive: string }> = {};
    for (const entry of recentLogs.data ?? []) {
      const agent = (entry.agent as string) ?? "unknown";
      if (agent === "ceo") continue;
      if (!departmentMap[agent]) {
        departmentMap[agent] = {
          summary:
            (entry.output_summary as string) ?? (entry.action as string) ?? "Active",
          lastActive: entry.created_at as string,
        };
      }
    }

    const agentSummaries: AgentSummary[] = Object.entries(departmentMap).map(
      ([dept, info]) => ({
        department: dept,
        summary: info.summary,
        lastActive: info.lastActive,
      }),
    );

    return { stats, agentSummaries };
  },
  buildSystemPrompt: (ctx, userName, memories) =>
    buildCEOSystemPrompt(ctx.stats, userName, memories, ctx.agentSummaries),
  buildTools: (userId) => buildCEOTools(userId),
  // Inject the seven dispatch tools — one per subagent. Each tool, when the
  // CEO model invokes it, runs a nested generateText against that
  // department's persona and tools.
  buildExtraTools: (userId, userName) => buildCEODispatchTools(userId, userName),
  // CEO can dispatch up to ~3 subagents per turn. Each dispatch has its own
  // 5-step inner loop, so total work is bounded at 3 × 5 = 15 tool calls
  // per user turn.
  maxSteps: 3,
});
