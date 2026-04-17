"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import {
  deleteDocumentForUser,
  insertCoverLetterForUser,
  updateDocumentForUser,
  type CoverLetterMutationInput,
} from "@/lib/db/queries/documents-mutations";

function parseCoverLetterFormData(formData: FormData): CoverLetterMutationInput | null {
  const title = (formData.get("title") as string | null)?.trim();
  const content = (formData.get("content") as string | null)?.trim();
  if (!title || !content) {
    return null;
  }

  return {
    title,
    content,
    applicationId: (formData.get("applicationId") as string | null)?.trim() || null,
    companyId: (formData.get("companyId") as string | null)?.trim() || null,
  };
}

export async function createCoverLetterAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const input = parseCoverLetterFormData(formData);
  if (!input) {
    return;
  }

  await insertCoverLetterForUser(supabase, user.id, input);
  revalidatePath("/writing-room");
}

export async function updateDocumentAction(id: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const input = parseCoverLetterFormData(formData);
  if (!input) {
    return;
  }

  await updateDocumentForUser(supabase, user.id, id, input.title, input.content);
  revalidatePath("/writing-room");
}

export async function deleteDocumentAction(id: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  await deleteDocumentForUser(supabase, user.id, id);
  revalidatePath("/writing-room");
}
