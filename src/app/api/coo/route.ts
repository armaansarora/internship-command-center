import { createAgentRouteHandler } from "@/lib/ai/agents/shared-route-handler";
import { getDailyBriefingData } from "@/lib/db/queries/communications-rest";
import { buildCOOSystemPrompt } from "@/lib/agents/coo/system-prompt";
import { buildCOOTools } from "@/lib/agents/coo/tools";

export const maxDuration = 60;

export const POST = createAgentRouteHandler({
  agentKey: "coo",
  loadContext: (user) => getDailyBriefingData(user.id),
  buildSystemPrompt: (briefingData, userName, memories) =>
    buildCOOSystemPrompt(briefingData, userName, memories),
  buildTools: (userId) => buildCOOTools(userId),
});
