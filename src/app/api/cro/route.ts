import { createAgentRoute } from "@/lib/agents/create-agent-route";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { buildCROSystemPrompt } from "@/lib/agents/cro/system-prompt";
import { buildCROTools } from "@/lib/agents/cro/tools";

export const maxDuration = 60;

export const POST = createAgentRoute({
  id: "cro",
  maxDuration,
  loadContext: async ({ user, userName }) => {
    const stats = await getPipelineStatsRest(user.id);
    return {
      systemPrompt: buildCROSystemPrompt(stats, userName, []),
      tools: buildCROTools(user.id),
    };
  },
});
