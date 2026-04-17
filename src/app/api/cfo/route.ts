import { createAgentRouteHandler } from "@/lib/ai/agents/shared-route-handler";
import { createClient } from "@/lib/supabase/server";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { buildCFOSystemPrompt } from "@/lib/agents/cfo/system-prompt";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";
import { buildCFOTools } from "@/lib/agents/cfo/tools";

export const maxDuration = 60;

interface CFOContext {
  stats: PipelineStats;
  snapshots: Array<{
    date: string;
    totalApplications: number;
    conversionRate: number;
    staleCount: number;
  }>;
}

export const POST = createAgentRouteHandler<CFOContext>({
  agentKey: "cfo",
  async loadContext(user) {
    const supabase = await createClient();
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const [stats, snapshotResult] = await Promise.all([
      getPipelineStatsRest(user.id),
      supabase
        .from("daily_snapshots")
        .select("date, total_applications, conversion_rate, stale_count")
        .eq("user_id", user.id)
        .gte("date", since)
        .order("date", { ascending: false })
        .limit(14),
    ]);

    const snapshots = (snapshotResult.data ?? []).map((s) => ({
      date: s.date as string,
      totalApplications: (s.total_applications as number | null) ?? 0,
      conversionRate: Number(s.conversion_rate ?? 0),
      staleCount: (s.stale_count as number | null) ?? 0,
    }));

    return { stats, snapshots };
  },
  buildSystemPrompt: (ctx, userName, memories) =>
    buildCFOSystemPrompt(ctx.stats, ctx.snapshots, userName, memories),
  buildTools: (userId) => buildCFOTools(userId),
});
