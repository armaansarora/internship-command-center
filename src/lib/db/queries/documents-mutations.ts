import type { SupabaseClient } from "@supabase/supabase-js";

export interface CoverLetterMutationInput {
  title: string;
  content: string;
  applicationId: string | null;
  companyId: string | null;
}

export async function insertCoverLetterForUser(
  supabase: SupabaseClient,
  userId: string,
  input: CoverLetterMutationInput,
): Promise<void> {
  await supabase.from("documents").insert({
    user_id: userId,
    type: "cover_letter",
    title: input.title,
    content: input.content,
    application_id: input.applicationId,
    company_id: input.companyId,
    version: 1,
    is_active: true,
    generated_by: "cmo",
  });
}

export async function updateDocumentForUser(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  title: string,
  content: string,
): Promise<void> {
  await supabase
    .from("documents")
    .update({
      title,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("user_id", userId);
}

export async function deleteDocumentForUser(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
): Promise<void> {
  await supabase.from("documents").delete().eq("id", documentId).eq("user_id", userId);
}
