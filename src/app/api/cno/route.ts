import { createAgentRouteHandler } from "@/lib/ai/agents/shared-route-handler";
import { getContactStats } from "@/lib/db/queries/contacts-rest";
import { buildCNOSystemPrompt } from "@/lib/agents/cno/system-prompt";
import { buildCNOTools } from "@/lib/agents/cno/tools";

export const maxDuration = 60;

export const POST = createAgentRouteHandler({
  agentKey: "cno",
  loadContext: (user) => getContactStats(user.id),
  buildSystemPrompt: (stats, userName, memories) =>
    buildCNOSystemPrompt(stats, userName, memories),
  buildTools: (userId) => buildCNOTools(userId),
});
