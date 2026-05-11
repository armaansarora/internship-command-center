import type { Metadata } from "next";
import type { JSX } from "react";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { isOwner } from "@/lib/auth/owner";
import { GATE_CONFIG } from "@/lib/config/gate-config";
import {
  getUserAuditTimeline,
  getUserConsentState,
  type AuditLogRow,
  type UserConsentState,
} from "@/lib/db/queries/trust-console-rest";
import { PrivacyClient } from "./privacy-client";

export const metadata: Metadata = {
  title: "Trust Console | The Tower",
  /** Trust Console is a per-account utility; never indexed. */
  robots: { index: false, follow: false },
};

/**
 * `/settings/privacy` — Trust Console (PR 4).
 *
 * Three layers of defense before the page renders:
 *
 *   1. `getUser()` — must be authenticated. Unauth → `/lobby`.
 *   2. `GATE_CONFIG.flags.trustConsoleEnabled()` — env flag.
 *      When off AND the caller is not the project owner (per
 *      `OWNER_USER_ID` / `OWNER_USER_IDS`), redirect back to
 *      `/settings`. Owners always preview the page.
 *
 * On render: fetches the user's consent state + audit timeline in
 * parallel via the REST helpers from PR4-Backend. Hands them to the
 * client island for the interactive surfaces (revoke modal, export,
 * delete-request). The Gmail/Calendar connection state is read off the
 * same `user_profiles` row so the consent timeline can show all three
 * lanes from a single snapshot.
 */
export default async function PrivacyPage(): Promise<JSX.Element> {
  const user = await getUser();
  if (!user) {
    redirect("/lobby");
  }

  const flagOn = GATE_CONFIG.flags.trustConsoleEnabled();
  const owner = isOwner(user.id);
  if (!flagOn && !owner) {
    redirect("/settings");
  }

  const supabase = await createClient();

  // `audit_logs` rows are read under RLS — pass the request-scoped client
  // (NOT the admin client) so the user only sees their own proof rows.
  const [consentState, auditTimeline, integrationsRow]: [
    UserConsentState,
    AuditLogRow[],
    { google: boolean; googleSinceIso: string | null; revokedSinceIso: string | null },
  ] = await Promise.all([
    getUserConsentState(supabase, user.id),
    getUserAuditTimeline(supabase, user.id, { limit: 100 }),
    (async () => {
      // Gmail / Calendar share the single google_tokens column on
      // user_profiles. We surface a single "Google workspace" lane in the
      // consent timeline by mirroring the same boolean into both lanes,
      // keeping the visual shape PR4-UI built without inventing two
      // independent connection timestamps the schema does not record.
      const { data } = await supabase
        .from("user_profiles")
        .select("google_tokens, networking_revoked_at")
        .eq("id", user.id)
        .maybeSingle();
      const connected = Boolean(
        (data as { google_tokens: string | null } | null)?.google_tokens,
      );
      return {
        google: connected,
        googleSinceIso: null,
        revokedSinceIso:
          (data as { networking_revoked_at: string | null } | null)
            ?.networking_revoked_at ?? null,
      };
    })(),
  ]);

  return (
    <PrivacyClient
      userEmail={user.email ?? ""}
      consentState={consentState}
      auditTimeline={auditTimeline}
      gmail={{
        connected: integrationsRow.google,
        sinceIso: integrationsRow.googleSinceIso,
      }}
      calendar={{
        connected: integrationsRow.google,
        sinceIso: integrationsRow.googleSinceIso,
      }}
      flagPreview={!flagOn && owner}
    />
  );
}
