import type { SupabaseClient } from "@supabase/supabase-js";

export interface CoverLetterMutationInput {
  title: string;
  content: string;
  applicationId: string | null;
  companyId: string | null;
}

async function coverLetterLinksBelongToUser(
  supabase: SupabaseClient,
  userId: string,
  input: CoverLetterMutationInput,
): Promise<boolean> {
  if (input.applicationId) {
    const { data: application, error } = await supabase
      .from("applications")
      .select("id, company_id")
      .eq("id", input.applicationId)
      .eq("user_id", userId)
      .maybeSingle<{ id: string; company_id: string | null }>();
    if (error || !application) return false;
    if (
      input.companyId &&
      application.company_id &&
      application.company_id !== input.companyId
    ) {
      return false;
    }
  }

  if (input.companyId) {
    const { data: company, error } = await supabase
      .from("companies")
      .select("id")
      .eq("id", input.companyId)
      .eq("user_id", userId)
      .maybeSingle<{ id: string }>();
    if (error || !company) return false;
  }

  return true;
}

export async function insertCoverLetterForUser(
  supabase: SupabaseClient,
  userId: string,
  input: CoverLetterMutationInput,
): Promise<void> {
  if (!(await coverLetterLinksBelongToUser(supabase, userId, input))) {
    return;
  }

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
