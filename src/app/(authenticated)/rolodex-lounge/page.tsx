import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { requireUser, createClient } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { RolodexLoungeClient } from "@/components/floor-6/RolodexLoungeClient";
import { getContactsByUser, getContactStats } from "@/lib/db/queries/contacts-rest";

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

  // ── Server Actions ───────────────────────────────────────────────────────

  async function createContact(formData: FormData): Promise<void> {
    "use server";
    const sessionUser = await requireUser();
    const sb = await createClient();

    const name = (formData.get("name") as string)?.trim();
    if (!name) return;

    const email = (formData.get("email") as string)?.trim() || null;
    const titleField = (formData.get("title") as string)?.trim() || null;
    const linkedinUrl =
      (formData.get("linkedinUrl") as string)?.trim() || null;
    const relationship =
      (formData.get("relationship") as string)?.trim() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;
    const introducedBy =
      (formData.get("introducedBy") as string)?.trim() || null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const companyId = (formData.get("companyId") as string)?.trim() || null;

    await sb.from("contacts").insert({
      user_id: sessionUser.id,
      name,
      email,
      title: titleField,
      linkedin_url: linkedinUrl,
      relationship,
      phone,
      introduced_by: introducedBy,
      notes,
      source: "manual",
      warmth: 100,
      company_id: companyId,
      last_contact_at: new Date().toISOString(),
    });

    revalidatePath("/rolodex-lounge");
  }

  async function updateContact(id: string, formData: FormData): Promise<void> {
    "use server";
    await requireUser();
    const sb = await createClient();

    const name = (formData.get("name") as string)?.trim();
    if (!name) return;

    const email = (formData.get("email") as string)?.trim() || null;
    const titleField = (formData.get("title") as string)?.trim() || null;
    const linkedinUrl =
      (formData.get("linkedinUrl") as string)?.trim() || null;
    const relationship =
      (formData.get("relationship") as string)?.trim() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;
    const introducedBy =
      (formData.get("introducedBy") as string)?.trim() || null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const companyId = (formData.get("companyId") as string)?.trim() || null;

    await sb
      .from("contacts")
      .update({
        name,
        email,
        title: titleField,
        linkedin_url: linkedinUrl,
        relationship,
        phone,
        introduced_by: introducedBy,
        notes,
        company_id: companyId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    revalidatePath("/rolodex-lounge");
  }

  async function deleteContact(id: string): Promise<void> {
    "use server";
    await requireUser();
    const sb = await createClient();
    await sb.from("contacts").delete().eq("id", id);
    revalidatePath("/rolodex-lounge");
  }

  async function linkContactToApplication(
    contactId: string,
    applicationId: string
  ): Promise<void> {
    "use server";
    await requireUser();
    const sb = await createClient();
    await sb
      .from("applications")
      .update({
        contact_id: contactId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);
    revalidatePath("/rolodex-lounge");
  }

  return (
    <FloorShell floorId="6">
      <RolodexLoungeClient
        contacts={contacts}
        contactStats={contactStats}
        companies={companies}
        onCreateContact={createContact}
        onUpdateContact={updateContact}
        onDeleteContact={deleteContact}
        onLinkContactToApplication={linkContactToApplication}
      />
    </FloorShell>
  );
}
