import type { SupabaseClient } from "@supabase/supabase-js";

interface InterviewPrepRow {
  application_id: string;
  company_id: string | null;
  round: string | null;
}

interface ApplicationPrepRow {
  company_name: string | null;
  role: string | null;
}

export async function createPrepPacketForInterview(
  supabase: SupabaseClient,
  userId: string,
  interviewId: string,
): Promise<void> {
  const { data: interview } = await supabase
    .from("interviews")
    .select("application_id, company_id, round")
    .eq("id", interviewId)
    .eq("user_id", userId)
    .single<InterviewPrepRow>();

  if (!interview) {
    return;
  }

  const { data: application } = await supabase
    .from("applications")
    .select("company_name, role")
    .eq("id", interview.application_id)
    .eq("user_id", userId)
    .single<ApplicationPrepRow>();

  const title = `Prep Packet - ${application?.company_name ?? "Unknown"} (${application?.role ?? "Unknown"})`;

  const { data: newDocument } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      type: "prep_packet",
      title,
      content: JSON.stringify({
        companyOverview: { industry: "Pending", keyBusinessLines: [] },
        questions: [],
        talkingPoints: [],
        completeness: 0,
      }),
      application_id: interview.application_id,
      company_id: interview.company_id,
      version: 1,
      is_active: true,
      generated_by: "cpo",
    })
    .select("id")
    .single<{ id: string }>();

  if (!newDocument) {
    return;
  }

  await supabase
    .from("interviews")
    .update({ prep_packet_id: newDocument.id })
    .eq("id", interviewId)
    .eq("user_id", userId);
}
