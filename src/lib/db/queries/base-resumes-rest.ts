/**
 * base_resumes queries — Supabase REST client only (no Drizzle runtime).
 *
 * The CMO tailoring tool and the /api/resumes/upload route consume these.
 * Storage blobs live in the private `resumes` bucket; this module handles
 * metadata + parsed-text only.
 */

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw snake_case row from the base_resumes table. */
export interface BaseResumeRow {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string;
  file_size_bytes: number;
  parsed_text: string;
  page_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** camelCase shape consumed by CMO tooling + UI. */
export interface BaseResumeForAgent {
  id: string;
  storagePath: string;
  originalFilename: string;
  fileSizeBytes: number;
  parsedText: string;
  pageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InsertBaseResumeInput {
  userId: string;
  storagePath: string;
  originalFilename: string;
  fileSizeBytes: number;
  parsedText: string;
  pageCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToAgentFormat(row: BaseResumeRow): BaseResumeForAgent {
  return {
    id: row.id,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
    fileSizeBytes: row.file_size_bytes,
    parsedText: row.parsed_text,
    pageCount: row.page_count,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Return every base-resume row for a user, newest first. Used by the
 * upload UI's "existing resumes" list + the settings surface.
 */
export async function listBaseResumes(userId: string): Promise<BaseResumeForAgent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("base_resumes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("[base-resumes] listBaseResumes failed", error, { userId });
    return [];
  }
  return (data ?? []).map((row) => rowToAgentFormat(row as BaseResumeRow));
}

/**
 * Return the currently active base resume for a user, or null.
 * This is what the CMO's tailoring tool reads as the canonical source.
 */
export async function getActiveBaseResume(userId: string): Promise<BaseResumeForAgent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("base_resumes")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    log.error("[base-resumes] getActiveBaseResume failed", error, { userId });
    return null;
  }
  return data ? rowToAgentFormat(data as BaseResumeRow) : null;
}

/**
 * Fetch a single row by id, scoped to the calling user.
 * Used by the signed-URL route to resolve the storage_path.
 */
export async function getBaseResumeById(
  userId: string,
  id: string,
): Promise<BaseResumeForAgent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("base_resumes")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    log.error("[base-resumes] getBaseResumeById failed", error, { userId, id });
    return null;
  }
  return data ? rowToAgentFormat(data as BaseResumeRow) : null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Insert a new base_resume row and flip it to is_active (de-activating
 * any others owned by the same user). Atomic from the user's
 * perspective — the call site can assume exactly one row is active
 * after this returns.
 */
export async function insertBaseResume(
  input: InsertBaseResumeInput,
): Promise<BaseResumeForAgent | null> {
  const supabase = await createClient();

  // Flip all existing to inactive first (no-op if none).
  await supabase
    .from("base_resumes")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("base_resumes")
    .insert({
      user_id: input.userId,
      storage_path: input.storagePath,
      original_filename: input.originalFilename,
      file_size_bytes: input.fileSizeBytes,
      parsed_text: input.parsedText,
      page_count: input.pageCount,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    log.error("[base-resumes] insertBaseResume failed", error ?? undefined, {
      userId: input.userId,
    });
    return null;
  }
  return rowToAgentFormat(data as BaseResumeRow);
}

/**
 * Flip `is_active` to true for one row (and false for every other row
 * owned by the same user). No-op if the row doesn't belong to the user.
 */
export async function setActiveBaseResume(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient();

  // Deactivate all siblings first.
  const { error: deactivateError } = await supabase
    .from("base_resumes")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (deactivateError) {
    log.error("[base-resumes] setActiveBaseResume deactivation failed", deactivateError, {
      userId,
      id,
    });
    return false;
  }

  const { error: activateError } = await supabase
    .from("base_resumes")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id);

  if (activateError) {
    log.error("[base-resumes] setActiveBaseResume activate failed", activateError, {
      userId,
      id,
    });
    return false;
  }
  return true;
}

/**
 * Hard-delete a row and its underlying Storage blob. Callers are expected
 * to check ownership first via getBaseResumeById.
 */
export async function deleteBaseResume(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const row = await getBaseResumeById(userId, id);
  if (!row) return false;

  const admin = getSupabaseAdmin();
  const { error: storageError } = await admin.storage
    .from("resumes")
    .remove([row.storagePath]);
  if (storageError) {
    log.error("[base-resumes] storage removal failed", storageError, {
      userId,
      id,
      path: row.storagePath,
    });
    // Continue to the row deletion — a dangling blob is better than a
    // dangling row, since the row is what gates UI visibility.
  }

  const { error } = await supabase
    .from("base_resumes")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    log.error("[base-resumes] deleteBaseResume failed", error, { userId, id });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Signed URL helper
// ---------------------------------------------------------------------------

/**
 * Mint a short-lived signed URL for a stored resume. Admin client bypasses
 * RLS on storage.objects; the caller MUST validate ownership via
 * getBaseResumeById before calling this.
 *
 * Non-negotiable per the R5 brief: the only path the user ever fetches
 * the PDF through. No public URL is ever generated.
 */
export async function mintSignedUrlForBaseResume(
  storagePath: string,
  ttlSeconds: number = 3600,
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage
    .from("resumes")
    .createSignedUrl(storagePath, ttlSeconds);

  if (error || !data) {
    log.error("[base-resumes] signed URL mint failed", error ?? undefined, { storagePath });
    return null;
  }
  return data.signedUrl;
}

/**
 * Probe the `resumes` bucket by attempting a trivial list call via the
 * admin client. Used by the upload route to distinguish the
 * "bucket not provisioned in this environment" error from user errors.
 *
 * Returns true if the bucket exists and is reachable; false otherwise.
 * The upload route MUST return 503 bucket_unprovisioned when this is
 * false — never fall back to public URLs.
 */
export async function probeResumesBucket(): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.storage.from("resumes").list("", { limit: 1 });
  if (error) {
    const message = error.message ?? "";
    if (
      message.includes("Bucket not found") ||
      message.includes("not found") ||
      message.includes("does not exist")
    ) {
      return false;
    }
    // Any other storage error — treat as a non-provision problem we can't
    // verify. Fail closed: the caller will surface a generic 503.
    log.error("[base-resumes] probeResumesBucket non-404 error", error);
    return false;
  }
  return true;
}
