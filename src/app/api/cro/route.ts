import { createAgentRouteHandler } from "@/lib/ai/agents/shared-route-handler";
import {
  getPipelineStatsRest,
  type PipelineStats,
} from "@/lib/db/queries/applications-rest";
import { buildCROSystemPrompt } from "@/lib/agents/cro/system-prompt";
import { buildCROTools } from "@/lib/agents/cro/tools";
import { getTargetProfile } from "@/lib/agents/cro/target-profile";
import type { TargetProfile } from "@/lib/agents/cro/target-profile";

export const maxDuration = 60;

interface CROContext {
  stats: PipelineStats;
  targetProfile: TargetProfile | null;
}

export const POST = createAgentRouteHandler<CROContext>({
  agentKey: "cro",
  loadContext: async (user) => {
    const [stats, stored] = await Promise.all([
      getPipelineStatsRest(user.id),
      getTargetProfile(user.id),
    ]);
    return { stats, targetProfile: stored?.profile ?? null };
  },
  buildSystemPrompt: (ctx, userName, memories) =>
    buildCROSystemPrompt(ctx.stats, userName, memories, ctx.targetProfile),
  buildTools: (userId) => buildCROTools(userId),
});
