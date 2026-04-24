import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { SettingsClient } from "./settings-client";
import { getSubscriptionTier } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { readRejectionReflectionsPref } from "@/lib/preferences/rejection-reflections-pref";
import { readCeoVoicePref } from "@/lib/preferences/ceo-voice-pref";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings page — account management, theme toggle, sign out.
 * BUG-012: Account/settings section with dark/light mode.
 * BUG-011: Dark/light mode toggle.
 * BUG-005: Sign out accessible from here too.
 * R0.7: Reads user_profiles.deleted_at so the Data section can swap
 *       Delete Account ↔ Cancel Deletion.
 * R9.6: Reads user_profiles.preferences.rejectionReflections so the
 *       Analytics section seeds the toggle correctly.
 */
export default async function SettingsPage() {
  const user = await requireUser();

  const [subscriptionTier, appsCountResult, profileData, matchEventsData] = await Promise.all([
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
        .select(
          "deleted_at, networking_consent_at, networking_revoked_at, preferences",
        )
        .eq("id", user.id)
        .single();
      return {
        deletedAt: (data?.deleted_at as string | null | undefined) ?? null,
        networkingConsentAt:
          (data?.networking_consent_at as string | null | undefined) ?? null,
        networkingRevokedAt:
          (data?.networking_revoked_at as string | null | undefined) ?? null,
        preferences: (data?.preferences as unknown) ?? null,
      };
    })(),
    (async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("match_events")
        .select("id, company_context, fired_at, edge_strength, match_reason")
        .eq("user_id", user.id)
        .order("fired_at", { ascending: false })
        .limit(20);
      return (data ?? []).map((r) => ({
        id: r.id as string,
        companyContext: r.company_context as string,
        firedAt: r.fired_at as string,
        edgeStrength: r.edge_strength as string,
        matchReason: r.match_reason as string,
      }));
    })(),
  ]);

  const rejectionReflectionsPref = readRejectionReflectionsPref(
    profileData.preferences,
  );
  const ceoVoicePref = readCeoVoicePref(profileData.preferences);

  return (
    <FloorShell floorId="PH">
      <SettingsClient
        userName={user.user_metadata?.full_name ?? user.user_metadata?.name ?? null}
        userEmail={user.email ?? ""}
        avatarUrl={user.user_metadata?.avatar_url ?? null}
        provider={user.app_metadata?.provider ?? "email"}
        subscriptionTier={subscriptionTier}
        appsUsed={appsCountResult}
        deletedAt={profileData.deletedAt}
        networkingConsentAt={profileData.networkingConsentAt}
        networkingRevokedAt={profileData.networkingRevokedAt}
        rejectionReflectionsEnabled={rejectionReflectionsPref.enabled}
        ceoVoiceEnabled={ceoVoicePref.enabled}
        matchEvents={matchEventsData}
      />
    </FloorShell>
  );
}
