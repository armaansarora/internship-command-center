/**
 * Rejection reflections REST helpers.
 *
 * One row per (user_id, application_id) — the UNIQUE constraint on
 * application_id in `rejection_reflections` enforces it at the DB level.
 * Powers the inline opt-in autopsy strip on the Floor-7 application card
 * (`RejectionReflectionStrip`) and the CFO's Floor-2 pattern aggregation
 * over time.
 *
 * Schema definition: src/db/schema.ts → rejectionReflections.
 * Migration: src/db/migrations/0019_r9_observatory.sql (must be applied
 * via Supabase SQL Editor).
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

const RejectionReflectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  application_id: z.string().uuid(),
  reasons: z.array(z.string()),
  free_text: z.string().nullable(),
  created_at: z.string(),
});

export type RejectionReflectionRow = z.infer<typeof RejectionReflectionSchema>;

export interface CreateRejectionReflectionInput {
  userId: string;
  applicationId: string;
  reasons: string[];
  freeText?: string | null;
}

/**
 * List a user's reflections, newest first. Drops malformed rows silently
 * — defensive against legacy or partial inserts.
 */
export async function listReflectionsForUser(
  userId: string,
  limit = 100,
): Promise<RejectionReflectionRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rejection_reflections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    log.error("rejection_reflections.list_failed", undefined, {
      userId,
      error: error.message,
    });
    return [];
  }

  if (!data) return [];

  const parsed: RejectionReflectionRow[] = [];
  for (const row of data) {
    const result = RejectionReflectionSchema.safeParse(row);
    if (result.success) parsed.push(result.data);
  }
  return parsed;
}

/**
 * Single-row lookup keyed by (user_id, application_id). Returns null
 * when no row exists, on validator failure, or on any DB error.
 */
export async function getReflectionForApplication(
  userId: string,
  applicationId: string,
): Promise<RejectionReflectionRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rejection_reflections")
    .select("*")
    .eq("user_id", userId)
    .eq("application_id", applicationId)
    .maybeSingle();

  if (error) {
    log.error("rejection_reflections.get_failed", undefined, {
      userId,
      applicationId,
      error: error.message,
    });
    return null;
  }

  if (!data) return null;

  const result = RejectionReflectionSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Insert a reflection row. The DB rejects a second insert for the same
 * application via the UNIQUE constraint — caller-side dedupe should
 * `getReflectionForApplication` first if they need upsert semantics.
 */
export async function createRejectionReflection(
  input: CreateRejectionReflectionInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rejection_reflections")
    .insert({
      user_id: input.userId,
      application_id: input.applicationId,
      reasons: input.reasons,
      free_text: input.freeText ?? null,
    })
    .select("id")
    .single();

  if (error) {
    log.error("rejection_reflections.create_failed", undefined, {
      userId: input.userId,
      applicationId: input.applicationId,
      error: error.message,
    });
    return { success: false, error: error.message };
  }

  return { success: true, id: (data as { id: string }).id };
}
