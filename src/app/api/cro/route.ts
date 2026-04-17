import { createAgentRouteHandler } from "@/lib/ai/agents/shared-route-handler";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { buildCROSystemPrompt } from "@/lib/agents/cro/system-prompt";
import { buildCROTools } from "@/lib/agents/cro/tools";

export const maxDuration = 60;

export const POST = createAgentRouteHandler({
  agentKey: "cro",
  loadContext: (user) => getPipelineStatsRest(user.id),
  buildSystemPrompt: (stats, userName, memories) =>
    buildCROSystemPrompt(stats, userName, memories),
  buildTools: (userId) => buildCROTools(userId),
});
