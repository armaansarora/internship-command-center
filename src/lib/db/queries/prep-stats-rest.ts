import { createClient } from "@/lib/supabase/server";
import type { PrepStats } from "@/lib/agents/cpo/system-prompt";

/**
 * Compute interview-prep statistics for the CPO agent via Supabase REST.
 * Mirrors the shape of other `*-rest` queries so the agent routes stay
 * uniform (one call, one object).
 */
export async function getPrepStats(userId: string): Promise<PrepStats> {
  const supabase = await createClient();

  const [interviewsResult, prepPacketsResult] = await Promise.all([
    supabase
      .from("interviews")
      .select("id, scheduled_at, status, application_id, prep_packet_id")
      .eq("user_id", userId),
    supabase
      .from("documents")
      .select("id, application_id")
      .eq("user_id", userId)
      .eq("type", "prep_packet")
      .eq("is_active", true),
  ]);

  const allInterviews = interviewsResult.data ?? [];
  const prepPackets = prepPacketsResult.data ?? [];
  const now = Date.now();

  const upcoming = allInterviews.filter(
    (i) =>
      i.scheduled_at &&
      new Date(i.scheduled_at as string).getTime() > now &&
      i.status !== "cancelled"
  );

  const withPrep = upcoming.filter((i) => i.prep_packet_id !== null);
  const withoutPrep = upcoming.filter((i) => i.prep_packet_id === null);

  const sortedUpcoming = [...upcoming].sort(
    (a, b) =>
      new Date(a.scheduled_at as string).getTime() -
      new Date(b.scheduled_at as string).getTime()
  );
  const next = sortedUpcoming[0] ?? null;

  let nextInterviewCompany: string | null = null;
  let nextInterviewHoursAway: number | null = null;

  if (next?.application_id) {
    const { data: app } = await supabase
      .from("applications")
      .select("company_name, role")
      .eq("id", next.application_id)
      .single();

    nextInterviewCompany = (app?.company_name as string | null) ?? null;
    nextInterviewHoursAway = Math.round(
      (new Date(next.scheduled_at as string).getTime() - now) / (1000 * 60 * 60)
    );
  }

  return {
    totalInterviews: allInterviews.length,
    upcomingInterviews: upcoming.length,
    interviewsWithPrepPackets: withPrep.length,
    interviewsWithoutPrepPackets: withoutPrep.length,
    totalPrepPackets: prepPackets.length,
    nextInterviewCompany,
    nextInterviewHoursAway,
  };
}
