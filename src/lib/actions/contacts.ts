"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import {
  deleteContactForUser,
  insertContactForUser,
  linkContactToApplicationForUser,
  updateContactForUser,
  type ContactMutationInput,
} from "@/lib/db/queries/contacts-mutations";

function parseContactFormData(formData: FormData): ContactMutationInput | null {
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) {
    return null;
  }

  return {
    name,
    email: (formData.get("email") as string | null)?.trim() || null,
    title: (formData.get("title") as string | null)?.trim() || null,
    linkedinUrl: (formData.get("linkedinUrl") as string | null)?.trim() || null,
    relationship: (formData.get("relationship") as string | null)?.trim() || null,
    phone: (formData.get("phone") as string | null)?.trim() || null,
    introducedBy: (formData.get("introducedBy") as string | null)?.trim() || null,
    notes: (formData.get("notes") as string | null)?.trim() || null,
    companyId: (formData.get("companyId") as string | null)?.trim() || null,
  };
}

export async function createContactAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const input = parseContactFormData(formData);
  if (!input) {
    return;
  }

  await insertContactForUser(supabase, user.id, input);
  revalidatePath("/rolodex-lounge");
}

export async function updateContactAction(id: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const input = parseContactFormData(formData);
  if (!input) {
    return;
  }

  await updateContactForUser(supabase, user.id, id, input);
  revalidatePath("/rolodex-lounge");
}

export async function deleteContactAction(id: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  await deleteContactForUser(supabase, user.id, id);
  revalidatePath("/rolodex-lounge");
}

export async function linkContactToApplicationAction(
  contactId: string,
  applicationId: string,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  await linkContactToApplicationForUser(supabase, user.id, contactId, applicationId);
  revalidatePath("/rolodex-lounge");
}
