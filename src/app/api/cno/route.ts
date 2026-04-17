import { streamText, stepCountIs, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { requireUser } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { requireAgentAccess } from "@/lib/stripe/agent-access";
import { getContactStats } from "@/lib/db/queries/contacts-rest";
import { buildCNOSystemPrompt } from "@/lib/agents/cno/system-prompt";
import { buildCNOTools } from "@/lib/agents/cno/tools";

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  const user = await requireUser();

  const accessResponse = await requireAgentAccess(user.id);
  if (accessResponse) return accessResponse;

  const check = await withRateLimit(user.id);
  if (check.response) return check.response;

  const body = (await req.json()) as { messages: UIMessage[] };
  const { messages } = body;

  // Fetch live contact stats via Supabase REST (Vercel-safe)
  const stats = await getContactStats(user.id);

  // Derive display name from email or metadata
  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Analyst";

  const systemPrompt = buildCNOSystemPrompt(stats, userName, []);

  const tools = buildCNOTools(user.id);

  const modelMessages = await convertToModelMessages(messages as Array<Omit<UIMessage, "id">>);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
