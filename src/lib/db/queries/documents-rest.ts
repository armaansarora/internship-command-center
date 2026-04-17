/**
 * Documents queries using Supabase REST client.
 * This is the Vercel-compatible version — Drizzle direct postgres fails on serverless.
 * All Writing Room server components and CMO tools use these.
 */

import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw snake_case row from the documents table */
export interface DocumentRow {
  id: string;
  user_id: string;
  application_id: string | null;
  company_id: string | null;
  type: string | null;
  title: string | null;
  content: string | null;
  version: number | null;
  is_active: boolean | null;
  parent_id: string | null;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** camelCase version used in agent tools and UI components */
export interface DocumentForAgent {
  id: string;
  applicationId: string | null;
  companyId: string | null;
  type: string | null;
  title: string | null;
  content: string | null;
  version: number;
  isActive: boolean;
  parentId: string | null;
  generatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Aggregate document stats for the CMO dynamic context */
export interface DocumentStats {
  totalDocuments: number;
  coverLetters: number;
  resumesTailored: number;
  prepPackets: number;
  debriefs: number;
  recentActivity: number; // documents created/updated in the last 7 days
  draftsByApplication: Record<string, number>; // applicationId -> count
}

/** Input shape for creating a new document */
export interface CreateDocumentInput {
  applicationId?: string;
  companyId?: string;
  type: "cover_letter" | "resume_tailored" | "prep_packet" | "debrief";
  title?: string;
  content?: string;
  version?: number;
  isActive?: boolean;
  parentId?: string;
  generatedBy?: string;
}

/** Input shape for updating an existing document */
export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  isActive?: boolean;
  generatedBy?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToAgentFormat(row: DocumentRow): DocumentForAgent {
  return {
    id: row.id,
    applicationId: row.application_id,
    companyId: row.company_id,
    type: row.type,
    title: row.title,
    content: row.content,
    version: row.version ?? 1,
    isActive: row.is_active ?? false,
    parentId: row.parent_id,
    generatedBy: row.generated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Queries (Supabase REST)
// ---------------------------------------------------------------------------

/**
 * List documents for a user with optional type and application filters.
 */
export async function getDocumentsByUser(
  userId: string,
  type?: string,
  applicationId?: string
): Promise<DocumentForAgent[]> {
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId);

  if (type) {
    query = query.eq("type", type);
  }

  if (applicationId) {
    query = query.eq("application_id", applicationId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false });

  if (error) {
    log.error("documents.get_by_user_failed", undefined, {
      userId,
      type: type ?? null,
      applicationId: applicationId ?? null,
      error: error.message,
    });
    return [];
  }

  return ((data ?? []) as DocumentRow[]).map(rowToAgentFormat);
}

/**
 * Fetch a single document by ID, scoped to the user.
 */
export async function getDocumentById(
  userId: string,
  documentId: string
): Promise<DocumentForAgent | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return rowToAgentFormat(data as DocumentRow);
}

/**
 * Insert a new document record for a user.
 */
export async function createDocument(
  userId: string,
  input: CreateDocumentInput
): Promise<{ success: boolean; document: DocumentForAgent | null; message: string }> {
  const supabase = await createClient();

  const insertRow: Record<string, unknown> = {
    user_id: userId,
    type: input.type,
    version: input.version ?? 1,
    is_active: input.isActive ?? false,
    updated_at: new Date().toISOString(),
  };

  if (input.applicationId !== undefined) insertRow.application_id = input.applicationId;
  if (input.companyId !== undefined) insertRow.company_id = input.companyId;
  if (input.title !== undefined) insertRow.title = input.title;
  if (input.content !== undefined) insertRow.content = input.content;
  if (input.parentId !== undefined) insertRow.parent_id = input.parentId;
  if (input.generatedBy !== undefined) insertRow.generated_by = input.generatedBy;

  const { data: created, error } = await supabase
    .from("documents")
    .insert(insertRow)
    .select()
    .single();

  if (error || !created) {
    return {
      success: false,
      document: null,
      message: `Insert failed: ${error?.message ?? "unknown error"}`,
    };
  }

  return {
    success: true,
    document: rowToAgentFormat(created as DocumentRow),
    message: `Document created successfully.`,
  };
}

/**
 * Update an existing document record, scoped to the user.
 */
export async function updateDocument(
  userId: string,
  documentId: string,
  input: UpdateDocumentInput
): Promise<{ success: boolean; document: DocumentForAgent | null; message: string }> {
  const supabase = await createClient();

  const updateRow: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updateRow.title = input.title;
  if (input.content !== undefined) updateRow.content = input.content;
  if (input.isActive !== undefined) updateRow.is_active = input.isActive;
  if (input.generatedBy !== undefined) updateRow.generated_by = input.generatedBy;

  const { data: updated, error } = await supabase
    .from("documents")
    .update(updateRow)
    .eq("id", documentId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !updated) {
    return {
      success: false,
      document: null,
      message: `Update failed: ${error?.message ?? "unknown error"}`,
    };
  }

  return {
    success: true,
    document: rowToAgentFormat(updated as DocumentRow),
    message: `Document updated successfully.`,
  };
}

/**
 * Compute aggregate document stats for the CMO system prompt dynamic context.
 */
export async function getDocumentStats(userId: string): Promise<DocumentStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("type, application_id, updated_at")
    .eq("user_id", userId);

  if (error || !data) {
    return emptyDocumentStats();
  }

  const now = Date.now();
  const recentCutoffMs = 7 * 24 * 60 * 60 * 1000;

  let coverLetters = 0;
  let resumesTailored = 0;
  let prepPackets = 0;
  let debriefs = 0;
  let recentActivity = 0;
  const draftsByApplication: Record<string, number> = {};

  for (const row of data) {
    switch (row.type) {
      case "cover_letter":
        coverLetters++;
        break;
      case "resume_tailored":
        resumesTailored++;
        break;
      case "prep_packet":
        prepPackets++;
        break;
      case "debrief":
        debriefs++;
        break;
    }

    const ageMs = now - new Date(row.updated_at as string).getTime();
    if (ageMs <= recentCutoffMs) {
      recentActivity++;
    }

    if (row.application_id) {
      const appId = row.application_id as string;
      draftsByApplication[appId] = (draftsByApplication[appId] ?? 0) + 1;
    }
  }

  return {
    totalDocuments: data.length,
    coverLetters,
    resumesTailored,
    prepPackets,
    debriefs,
    recentActivity,
    draftsByApplication,
  };
}

/**
 * Get all versions of a document via the parentId chain.
 * Returns the full chain from root to the given documentId, ordered oldest first.
 */
export async function getDocumentVersionChain(
  userId: string,
  documentId: string
): Promise<DocumentForAgent[]> {
  const supabase = await createClient();

  // Fetch the target document first to find its root via parentId chain
  const target = await getDocumentById(userId, documentId);
  if (!target) return [];

  // Walk up the parent chain to find the root
  const chainIds: string[] = [documentId];
  let current: DocumentForAgent | null = target;

  while (current?.parentId) {
    const parent = await getDocumentById(userId, current.parentId);
    if (!parent) break;
    chainIds.unshift(current.parentId);
    current = parent;
  }

  // The root is chainIds[0] — now fetch all descendants from the root
  const rootId = chainIds[0];

  // Fetch all documents that share the same root:
  // - the root itself
  // - all documents whose parent_id exists in our known chain
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .or(`id.eq.${rootId},parent_id.eq.${rootId}`);

  if (error || !data) return [target];

  // Sort by version ascending to show oldest→newest
  const results = ((data ?? []) as DocumentRow[])
    .map(rowToAgentFormat)
    .sort((a, b) => a.version - b.version);

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyDocumentStats(): DocumentStats {
  return {
    totalDocuments: 0,
    coverLetters: 0,
    resumesTailored: 0,
    prepPackets: 0,
    debriefs: 0,
    recentActivity: 0,
    draftsByApplication: {},
  };
}
