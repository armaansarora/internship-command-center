import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { SettingsClient } from "./settings-client";
import { getSubscriptionTier } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings page — account management, theme toggle, sign out.
 * BUG-012: Account/settings section with dark/light mode.
 * BUG-011: Dark/light mode toggle.
 * BUG-005: Sign out accessible from here too.
 * R0.7: Reads user_profiles.deleted_at so the Data section can swap
 *       Delete Account ↔ Cancel Deletion.
 */
export default async function SettingsPage() {
  const user = await requireUser();

  const [subscriptionTier, appsCountResult, deletedAt] = await Promise.all([
    getSubscriptionTier(user.id),
    (async () => {
      const supabase = await createClient();
      const { count } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count ?? 0;
    })(),
    (async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("user_profiles")
        .select("deleted_at")
        .eq("id", user.id)
        .single();
      return (data?.deleted_at as string | null | undefined) ?? null;
    })(),
  ]);

  return (
    <FloorShell floorId="PH">
      <SettingsClient
        userName={user.user_metadata?.full_name ?? user.user_metadata?.name ?? null}
        userEmail={user.email ?? ""}
        avatarUrl={user.user_metadata?.avatar_url ?? null}
        provider={user.app_metadata?.provider ?? "email"}
        subscriptionTier={subscriptionTier}
        appsUsed={appsCountResult}
        deletedAt={deletedAt}
      />
    </FloorShell>
  );
}
