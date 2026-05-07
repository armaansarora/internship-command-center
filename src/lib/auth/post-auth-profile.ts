import type { SupabaseClient, User } from "@supabase/supabase-js";
import { log } from "@/lib/logger";

type AuthUser = Pick<User, "id" | "email" | "user_metadata">;

interface ProfileStateRow {
  arrival_played_at: string | null;
  concierge_completed_at: string | null;
}

function metadataString(
  metadata: AuthUser["user_metadata"],
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export async function needsLobbyOnboardingAfterAuth(
  supabase: SupabaseClient,
  user: AuthUser | null | undefined,
): Promise<boolean> {
  if (!user?.id || !user.email) return true;

  const { error: upsertError } = await supabase
    .from("user_profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        display_name:
          metadataString(user.user_metadata, "full_name") ??
          metadataString(user.user_metadata, "name"),
        avatar_url: metadataString(user.user_metadata, "avatar_url"),
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

  if (upsertError) {
    log.warn("auth.callback.profile_ensure_failed", {
      userId: user.id,
      error: upsertError.message,
    });
    return true;
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("arrival_played_at, concierge_completed_at")
    .eq("id", user.id)
    .single();

  if (error) {
    log.warn("auth.callback.profile_state_failed", {
      userId: user.id,
      error: error.message,
    });
    return true;
  }

  const state = data as ProfileStateRow | null;
  return (
    !state?.arrival_played_at ||
    !state.concierge_completed_at
  );
}
