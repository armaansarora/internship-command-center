import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings page — account management, theme toggle, sign out.
 * BUG-012: Account/settings section with dark/light mode.
 * BUG-011: Dark/light mode toggle.
 * BUG-005: Sign out accessible from here too.
 */
export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <FloorShell floorId="PH">
      <SettingsClient
        userName={user.user_metadata?.full_name ?? user.user_metadata?.name ?? null}
        userEmail={user.email ?? ""}
        avatarUrl={user.user_metadata?.avatar_url ?? null}
        provider={user.app_metadata?.provider ?? "email"}
      />
    </FloorShell>
  );
}
