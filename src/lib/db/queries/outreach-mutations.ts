import type { SupabaseClient } from "@supabase/supabase-js";

export async function approveOutreachForUser(
  supabase: SupabaseClient,
  userId: string,
  outreachId: string,
): Promise<void> {
  await supabase
    .from("outreach_queue")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", outreachId)
    .eq("user_id", userId);
}
