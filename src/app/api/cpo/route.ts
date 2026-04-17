import { createAgentRouteHandler } from "@/lib/ai/agents/shared-route-handler";
import { getPrepStats } from "@/lib/db/queries/prep-stats-rest";
import { buildCPOSystemPrompt } from "@/lib/agents/cpo/system-prompt";
import { buildCPOTools } from "@/lib/agents/cpo/tools";

export const maxDuration = 60;

export const POST = createAgentRouteHandler({
  agentKey: "cpo",
  loadContext: (user) => getPrepStats(user.id),
  buildSystemPrompt: (stats, userName, memories) =>
    buildCPOSystemPrompt(stats, userName, memories),
  buildTools: (userId) => buildCPOTools(userId),
  defaultUserName: "Candidate",
});
