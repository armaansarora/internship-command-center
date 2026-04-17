import type { SupabaseClient } from "@supabase/supabase-js";

export interface ContactMutationInput {
  name: string;
  email: string | null;
  title: string | null;
  linkedinUrl: string | null;
  relationship: string | null;
  phone: string | null;
  introducedBy: string | null;
  notes: string | null;
  companyId: string | null;
}

export async function insertContactForUser(
  supabase: SupabaseClient,
  userId: string,
  input: ContactMutationInput,
): Promise<void> {
  await supabase.from("contacts").insert({
    user_id: userId,
    name: input.name,
    email: input.email,
    title: input.title,
    linkedin_url: input.linkedinUrl,
    relationship: input.relationship,
    phone: input.phone,
    introduced_by: input.introducedBy,
    notes: input.notes,
    source: "manual",
    warmth: 100,
    company_id: input.companyId,
    last_contact_at: new Date().toISOString(),
  });
}

export async function updateContactForUser(
  supabase: SupabaseClient,
  userId: string,
  contactId: string,
  input: ContactMutationInput,
): Promise<void> {
  await supabase
    .from("contacts")
    .update({
      name: input.name,
      email: input.email,
      title: input.title,
      linkedin_url: input.linkedinUrl,
      relationship: input.relationship,
      phone: input.phone,
      introduced_by: input.introducedBy,
      notes: input.notes,
      company_id: input.companyId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .eq("user_id", userId);
}

export async function deleteContactForUser(
  supabase: SupabaseClient,
  userId: string,
  contactId: string,
): Promise<void> {
  await supabase.from("contacts").delete().eq("id", contactId).eq("user_id", userId);
}

export async function linkContactToApplicationForUser(
  supabase: SupabaseClient,
  userId: string,
  contactId: string,
  applicationId: string,
): Promise<void> {
  await supabase
    .from("applications")
    .update({
      contact_id: contactId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("user_id", userId);
}
