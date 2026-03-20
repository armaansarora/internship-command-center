import { streamText, stepCountIs, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { requireUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { buildCPOSystemPrompt } from "@/lib/agents/cpo/system-prompt";
import type { PrepStats } from "@/lib/agents/cpo/system-prompt";
import { buildCPOTools } from "@/lib/agents/cpo/tools";

export const maxDuration = 60;

/** Compute prep stats from Supabase REST data */
async function computePrepStats(userId: string): Promise<PrepStats> {
  const supabase = await createClient();

  // Fetch interviews
  const { data: interviews } = await supabase
    .from("interviews")
    .select("id, scheduled_at, status, application_id, prep_packet_id")
    .eq("user_id", userId);

  // Fetch prep packets
  const { data: prepPackets } = await supabase
    .from("documents")
    .select("id, application_id")
    .eq("user_id", userId)
    .eq("type", "prep_packet")
    .eq("is_active", true);

  const allInterviews = interviews ?? [];
  const now = new Date();

  const upcoming = allInterviews.filter(
    (i) => i.scheduled_at && new Date(i.scheduled_at) > now && i.status !== "cancelled"
  );

  const withPrep = upcoming.filter((i) => i.prep_packet_id !== null);
  const withoutPrep = upcoming.filter((i) => i.prep_packet_id === null);

  // Find next interview
  const sortedUpcoming = [...upcoming].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );
  const next = sortedUpcoming[0] ?? null;

  let nextInterviewCompany: string | null = null;
  let nextInterviewHoursAway: number | null = null;

  if (next) {
    // Try to get company name from application
    const { data: app } = await supabase
      .from("applications")
      .select("company_name, role")
      .eq("id", next.application_id)
      .single();

    nextInterviewCompany = app?.company_name ?? null;
    nextInterviewHoursAway = Math.round(
      (new Date(next.scheduled_at).getTime() - now.getTime()) / (1000 * 60 * 60)
    );
  }

  return {
    totalInterviews: allInterviews.length,
    upcomingInterviews: upcoming.length,
    interviewsWithPrepPackets: withPrep.length,
    interviewsWithoutPrepPackets: withoutPrep.length,
    totalPrepPackets: (prepPackets ?? []).length,
    nextInterviewCompany,
    nextInterviewHoursAway,
  };
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireUser();

  const body = (await req.json()) as { messages: UIMessage[] };
  const { messages } = body;

  // Fetch live prep stats via Supabase REST (Vercel-safe)
  const stats = await computePrepStats(user.id);

  // Derive display name from email or metadata
  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Candidate";

  const systemPrompt = buildCPOSystemPrompt(stats, userName, []);

  const tools = buildCPOTools(user.id);

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
