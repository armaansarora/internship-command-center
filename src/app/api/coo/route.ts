import { streamText, stepCountIs, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { requireUser } from "@/lib/supabase/server";
import { getDailyBriefingData } from "@/lib/db/queries/communications-rest";
import { buildCOOSystemPrompt } from "@/lib/agents/coo/system-prompt";
import { buildCOOTools } from "@/lib/agents/coo/tools";

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  const user = await requireUser();

  const body = (await req.json()) as { messages: UIMessage[] };
  const { messages } = body;

  // Fetch live briefing data via Supabase REST (Vercel-safe)
  const briefingData = await getDailyBriefingData(user.id);

  // Derive display name from email or metadata
  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Analyst";

  const systemPrompt = buildCOOSystemPrompt(briefingData, userName, []);

  const tools = buildCOOTools(user.id);

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
