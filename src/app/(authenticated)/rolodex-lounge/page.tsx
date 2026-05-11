import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { requireUser, createClient } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { RolodexLoungeClient } from "@/components/floor-6/RolodexLoungeClient";
import { getContactsByUser, getContactStats } from "@/lib/db/queries/contacts-rest";
import {
  createContactAction,
  deleteContactAction,
  linkContactToApplicationAction,
  updateContactAction,
} from "@/lib/actions/contacts";

export const metadata: Metadata = { title: "The Rolodex Lounge | The Tower" };

/** Floor 6 — Contacts Network + CNO Agent.
 *
 * The CIO surface (character, whiteboard, dialogue) was folded out of
 * the visible cast in the activation gauntlet pass; the lounge now
 * surfaces a single character so a first-time visitor has one clear
 * affordance instead of two competing ones. Skyline + chrome paint
 * immediately; the contact grid streams into the Suspense boundary so
 * the floor's atmosphere appears first.
 */
export default async function RolodexLoungePage(): Promise<JSX.Element> {
  const user = await requireUser();

  return (
    <FloorShell floorId="6">
      <Suspense fallback={null}>
        <RolodexLoungeData userId={user.id} />
      </Suspense>
    </FloorShell>
  );
}

async function RolodexLoungeData({
  userId,
}: {
  userId: string;
}): Promise<JSX.Element> {
  const supabase = await createClient();

  // Fetch contacts (with warmth computed) and the company list — the
  // contact modal needs the company list to link a contact to a company
  // record, but no longer needs the CIO research-freshness derivation.
  const [contacts, contactStats, companiesResult] = await Promise.all([
    getContactsByUser(userId),
    getContactStats(userId),
    supabase
      .from("companies")
      .select("id, name")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
  ]);

  type CompanyRow = { id: string; name: string };

  const companyRows = (companiesResult.data ?? []) as CompanyRow[];

  const companies = companyRows.map((row) => ({
    id: row.id,
    name: row.name,
  }));

  return (
    <RolodexLoungeClient
      contacts={contacts}
      contactStats={contactStats}
      companies={companies}
      onCreateContact={createContactAction}
      onUpdateContact={updateContactAction}
      onDeleteContact={deleteContactAction}
      onLinkContactToApplication={linkContactToApplicationAction}
    />
  );
}

