import type { SupabaseClient } from "@supabase/supabase-js";

export async function dismissNotificationForUser(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string,
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_dismissed: true })
    .eq("id", notificationId)
    .eq("user_id", userId);
}
