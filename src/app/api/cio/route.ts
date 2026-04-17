import { createAgentRoute } from "@/lib/agents/create-agent-route";
import { getResearchStats } from "@/lib/db/queries/companies-rest";
import { buildCIOSystemPrompt } from "@/lib/agents/cio/system-prompt";
import { buildCIOTools } from "@/lib/agents/cio/tools";

export const maxDuration = 60;

export const POST = createAgentRoute({
  id: "cio",
  maxDuration,
  loadContext: async ({ user, userName }) => {
    const stats = await getResearchStats(user.id);
    return {
      systemPrompt: buildCIOSystemPrompt(stats, userName, []),
      tools: buildCIOTools(user.id),
    };
  },
});
