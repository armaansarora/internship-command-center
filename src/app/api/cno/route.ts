import { createAgentRoute } from "@/lib/agents/create-agent-route";
import { getContactStats } from "@/lib/db/queries/contacts-rest";
import { buildCNOSystemPrompt } from "@/lib/agents/cno/system-prompt";
import { buildCNOTools } from "@/lib/agents/cno/tools";

export const maxDuration = 60;

export const POST = createAgentRoute({
  id: "cno",
  maxDuration,
  loadContext: async ({ user, userName }) => {
    const stats = await getContactStats(user.id);
    return {
      systemPrompt: buildCNOSystemPrompt(stats, userName, []),
      tools: buildCNOTools(user.id),
    };
  },
});
