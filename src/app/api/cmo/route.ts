import { createAgentRouteHandler } from "@/lib/ai/agents/shared-route-handler";
import { getDocumentStats } from "@/lib/db/queries/documents-rest";
import { buildCMOSystemPrompt } from "@/lib/agents/cmo/system-prompt";
import { buildCMOTools } from "@/lib/agents/cmo/tools";

export const maxDuration = 60;

export const POST = createAgentRouteHandler({
  agentKey: "cmo",
  loadContext: (user) => getDocumentStats(user.id),
  buildSystemPrompt: (stats, userName, memories) =>
    buildCMOSystemPrompt(stats, userName, memories),
  buildTools: (userId) => buildCMOTools(userId),
  defaultUserName: "Writer",
});
