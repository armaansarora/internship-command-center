import { createAgentRoute } from "@/lib/agents/create-agent-route";
import { getDailyBriefingData } from "@/lib/db/queries/communications-rest";
import { buildCOOSystemPrompt } from "@/lib/agents/coo/system-prompt";
import { buildCOOTools } from "@/lib/agents/coo/tools";

export const maxDuration = 60;

export const POST = createAgentRoute({
  id: "coo",
  maxDuration,
  loadContext: async ({ user, userName }) => {
    const briefingData = await getDailyBriefingData(user.id);
    return {
      systemPrompt: buildCOOSystemPrompt(briefingData, userName, []),
      tools: buildCOOTools(user.id),
    };
  },
});
