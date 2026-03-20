import { streamText, stepCountIs, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { requireUser } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { getResearchStats } from "@/lib/db/queries/companies-rest";
import { buildCIOSystemPrompt } from "@/lib/agents/cio/system-prompt";
import { buildCIOTools } from "@/lib/agents/cio/tools";

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  const user = await requireUser();

  const check = await withRateLimit(user.id);
  if (check.response) return check.response;

  const body = (await req.json()) as { messages: UIMessage[] };
  const { messages } = body;

  // Fetch live research stats via Supabase REST (Vercel-safe)
  const stats = await getResearchStats(user.id);

  // Derive display name from email or metadata
  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Analyst";

  const systemPrompt = buildCIOSystemPrompt(stats, userName, []);

  const tools = buildCIOTools(user.id);

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
