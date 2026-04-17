import { createAgentRoute } from "@/lib/agents/create-agent-route";
import { getDocumentStats } from "@/lib/db/queries/documents-rest";
import { buildCMOSystemPrompt } from "@/lib/agents/cmo/system-prompt";
import { buildCMOTools } from "@/lib/agents/cmo/tools";

export const maxDuration = 60;

export const POST = createAgentRoute({
  id: "cmo",
  maxDuration,
  deriveUserName: (user) =>
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Writer",
  loadContext: async ({ user, userName }) => {
    const stats = await getDocumentStats(user.id);
    return {
      systemPrompt: buildCMOSystemPrompt(stats, userName, []),
      tools: buildCMOTools(user.id),
    };
  },
});
