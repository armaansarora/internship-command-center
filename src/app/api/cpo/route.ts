import { createAgentRoute } from "@/lib/agents/create-agent-route";
import { getPrepStats } from "@/lib/db/queries/prep-stats-rest";
import { buildCPOSystemPrompt } from "@/lib/agents/cpo/system-prompt";
import { buildCPOTools } from "@/lib/agents/cpo/tools";

export const maxDuration = 60;

export const POST = createAgentRoute({
  id: "cpo",
  maxDuration,
  deriveUserName: (user) =>
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Candidate",
  loadContext: async ({ user, userName }) => {
    const stats = await getPrepStats(user.id);
    return {
      systemPrompt: buildCPOSystemPrompt(stats, userName, []),
      tools: buildCPOTools(user.id),
    };
  },
});
