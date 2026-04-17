import type { Metadata } from "next";
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

/** Floor 6 — Contacts Network + CNO Agent */
export default async function RolodexLoungePage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch contacts (with warmth computed) and companies in parallel
  const [contacts, contactStats, companiesResult] = await Promise.all([
    getContactsByUser(user.id),
    getContactStats(user.id),
    supabase
      .from("companies")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const companies = (companiesResult.data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
  }));

  return (
    <FloorShell floorId="6">
      <RolodexLoungeClient
        contacts={contacts}
        contactStats={contactStats}
        companies={companies}
        onCreateContact={createContactAction}
        onUpdateContact={updateContactAction}
        onDeleteContact={deleteContactAction}
        onLinkContactToApplication={linkContactToApplicationAction}
      />
    </FloorShell>
  );
}
