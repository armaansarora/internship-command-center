import { createAgentRouteHandler } from "@/lib/ai/agents/shared-route-handler";
import { getResearchStats } from "@/lib/db/queries/companies-rest";
import { buildCIOSystemPrompt } from "@/lib/agents/cio/system-prompt";
import { buildCIOTools } from "@/lib/agents/cio/tools";

export const maxDuration = 60;

export const POST = createAgentRouteHandler({
  agentKey: "cio",
  loadContext: (user) => getResearchStats(user.id),
  buildSystemPrompt: (stats, userName, memories) =>
    buildCIOSystemPrompt(stats, userName, memories),
  buildTools: (userId) => buildCIOTools(userId),
});
