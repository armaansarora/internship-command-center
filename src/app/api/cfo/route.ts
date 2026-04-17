import { streamText, stepCountIs, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { requireUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { requireAgentAccess } from "@/lib/stripe/agent-access";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";
import { buildCFOSystemPrompt } from "@/lib/agents/cfo/system-prompt";
import { buildCFOTools } from "@/lib/agents/cfo/tools";

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  const user = await requireUser();

  const accessResponse = await requireAgentAccess(user.id);
  if (accessResponse) return accessResponse;

  const check = await withRateLimit(user.id);
  if (check.response) return check.response;

  const body = (await req.json()) as { messages: UIMessage[] };
  const { messages } = body;

  // Fetch pipeline stats via Supabase REST (Vercel-safe)
  const stats = await getPipelineStatsRest(user.id);

  // Derive display name from email or metadata
  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Analyst";

  // Fetch recent daily snapshots for historical comparison
  const supabase = await createClient();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: snapshotData } = await supabase
    .from("daily_snapshots")
    .select(
      "snapshot_date:date, total_applications, conversion_rate, stale_count"
    )
    .eq("user_id", user.id)
    .gte("date", since)
    .order("date", { ascending: false })
    .limit(14);

  const snapshots = (snapshotData ?? []).map((s) => ({
    date: s.snapshot_date as string,
    totalApplications: (s.total_applications as number) ?? 0,
    conversionRate: Number(s.conversion_rate ?? 0),
    staleCount: (s.stale_count as number) ?? 0,
  }));

  const systemPrompt = buildCFOSystemPrompt(stats, snapshots, userName, []);

  const tools = buildCFOTools(user.id);

  const modelMessages = await convertToModelMessages(
    messages as Array<Omit<UIMessage, "id">>
  );

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
