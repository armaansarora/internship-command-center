import type { Metadata } from "next";
import type { JSX } from "react";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getTargetProfile } from "@/lib/agents/cro/target-profile";
import { ActivateClient } from "./activate-client";

export const metadata: Metadata = { title: "Activate Your Campaign" };

/**
 * The Activation Gauntlet — server entry point.
 *
 * Auth + idempotency gates:
 *   1. Unauthenticated users → /lobby (the single sign-in surface).
 *   2. Users with a TargetProfile AND at least one application → /penthouse.
 *      Both signals together mean the gauntlet ran to completion.
 *   3. Users with a TargetProfile but no applications → resume at phase B
 *      (source pick). They got partway and bailed; don't lock them out.
 *
 * Why both checks: phase A writes the profile, phase B writes the first
 * app. If we only checked the profile, anyone who closed the tab between
 * those two phases would be redirected away from /activate forever.
 *
 * The server resolves a display name (full_name → email prefix → empty
 * fallback) and hands the userId + name to the client. Every functional
 * server-action call from the client re-verifies the session, so the
 * userId passed here is only for greeting copy — never trust it for auth.
 *
 * Visual choreography (Beats 3 + 6) is wired by a later PR; the client
 * surfaces four functional phases (intake / source pick / working /
 * delivered) so the visual layer can drop in without re-plumbing data.
 */
export default async function ActivatePage(): Promise<JSX.Element> {
  const user = await getUser();
  if (!user) {
    redirect("/lobby");
  }

  const supabase = await createClient();
  const [profile, appCountResult] = await Promise.all([
    getTargetProfile(user.id),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const appCount = appCountResult.count ?? 0;
  if (profile && appCount > 0) {
    redirect("/penthouse");
  }

  const userName =
    ((user.user_metadata?.full_name as string | undefined)?.trim() ||
      user.email?.split("@")[0] ||
      "");

  // Profile exists but no apps yet → resume at source pick.
  const initialPhase = profile ? "source" : "intake";

  return (
    <ActivateClient
      userId={user.id}
      userName={userName}
      initialPhase={initialPhase}
    />
  );
}
