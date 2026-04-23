/**
 * Target Profile — what the user wants the CRO to hunt for.
 *
 * The CRO's first conversation with a cold user captures this profile. It
 * becomes the query vector for Job Discovery: every candidate JD is scored
 * against this target via pgvector cosine similarity.
 *
 * Storage strategy: we piggyback on `agent_memory` rather than add a dedicated
 * table — the profile IS a kind of preference the CRO remembers. We mark the
 * row with a prefix (TARGET_PROFILE_MARKER) so we can find it later without
 * a schema migration. Only one active profile per user; upsert replaces.
 */
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

export const TARGET_PROFILE_MARKER = "[target_profile_v1]";
const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small");

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const TargetProfileSchema = z.object({
  version: z.literal(1).default(1),
  roles: z
    .array(z.string().min(1).max(80))
    .min(1, "At least one role is required")
    .max(8),
  level: z
    .array(
      z.enum([
        "intern",
        "new_grad",
        "early_career",
        "mid_level",
        "senior",
        "staff",
      ])
    )
    .min(1)
    .max(6)
    .default(["intern", "new_grad"]),
  companies: z.array(z.string().min(1).max(80)).max(25).default([]),
  geos: z.array(z.string().min(1).max(80)).min(1).max(8),
  musts: z.array(z.string().min(1).max(140)).max(10).default([]),
  nices: z.array(z.string().min(1).max(140)).max(10).default([]),
  notes: z.string().max(800).optional(),
});
export type TargetProfile = z.infer<typeof TargetProfileSchema>;

// ---------------------------------------------------------------------------
// Serialization — marker + JSON + narrative (so the embedding is meaningful)
// ---------------------------------------------------------------------------

export function serializeTargetProfile(tp: TargetProfile): string {
  const narrative = buildNarrativeSummary(tp);
  return `${TARGET_PROFILE_MARKER}\n${JSON.stringify(tp)}\n\n${narrative}`;
}

export function tryParseTargetProfile(content: string | null | undefined):
  | TargetProfile
  | null {
  if (!content) return null;
  if (!content.startsWith(TARGET_PROFILE_MARKER)) return null;

  const afterMarker = content.slice(TARGET_PROFILE_MARKER.length).trimStart();
  const newlineIdx = afterMarker.indexOf("\n");
  const jsonLine = newlineIdx === -1 ? afterMarker : afterMarker.slice(0, newlineIdx);

  try {
    const raw = JSON.parse(jsonLine);
    return TargetProfileSchema.parse(raw);
  } catch (err) {
    log.warn("target_profile.parse_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function buildNarrativeSummary(tp: TargetProfile): string {
  const lines: string[] = [];
  lines.push(
    `Role focus: ${tp.roles.join(", ")} (${tp.level.join(", ")} level).`
  );
  if (tp.companies.length > 0) {
    lines.push(`Target companies: ${tp.companies.join(", ")}.`);
  }
  lines.push(`Geographies: ${tp.geos.join(", ")}.`);
  if (tp.musts.length > 0) {
    lines.push(`Must-haves: ${tp.musts.join("; ")}.`);
  }
  if (tp.nices.length > 0) {
    lines.push(`Nice-to-haves: ${tp.nices.join("; ")}.`);
  }
  if (tp.notes && tp.notes.trim()) {
    lines.push(`Notes: ${tp.notes.trim()}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Storage — agent_memory with a target_profile marker + vector
// ---------------------------------------------------------------------------

export interface StoredTargetProfile {
  profile: TargetProfile;
  embedding: number[] | null;
  updatedAt: string;
  rowId: string;
}

export async function upsertTargetProfile(
  userId: string,
  profile: TargetProfile
): Promise<StoredTargetProfile | null> {
  const supabase = await createClient();
  const parsed = TargetProfileSchema.parse(profile);
  const content = serializeTargetProfile(parsed);

  let embedding: number[] | null = null;
  try {
    const result = await embed({ model: EMBEDDING_MODEL, value: content });
    embedding = result.embedding;
  } catch (err) {
    log.warn("target_profile.embed_failed", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  await supabase
    .from("agent_memory")
    .delete()
    .eq("user_id", userId)
    .eq("agent", "cro")
    .eq("category", "preference")
    .like("content", `${TARGET_PROFILE_MARKER}%`);

  const payload: Record<string, unknown> = {
    user_id: userId,
    agent: "cro",
    category: "preference",
    content,
    importance: "0.95",
    access_count: 0,
    last_accessed_at: new Date().toISOString(),
  };
  if (embedding) payload.embedding = embedding;

  const { data, error } = await supabase
    .from("agent_memory")
    .insert(payload)
    .select("id, embedding, updated_at")
    .single();

  if (error || !data) {
    log.error("target_profile.insert_failed", undefined, {
      userId,
      error: error?.message,
    });
    return null;
  }

  return {
    profile: parsed,
    embedding: (data.embedding as number[] | null) ?? embedding,
    updatedAt: data.updated_at as string,
    rowId: data.id as string,
  };
}

export async function getTargetProfile(
  userId: string
): Promise<StoredTargetProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_memory")
    .select("id, content, embedding, updated_at")
    .eq("user_id", userId)
    .eq("agent", "cro")
    .eq("category", "preference")
    .like("content", `${TARGET_PROFILE_MARKER}%`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    log.error("target_profile.read_failed", undefined, {
      userId,
      error: error.message,
    });
    return null;
  }
  if (!data) return null;

  const profile = tryParseTargetProfile(data.content as string | null);
  if (!profile) return null;

  return {
    profile,
    embedding: (data.embedding as number[] | null) ?? null,
    updatedAt: data.updated_at as string,
    rowId: data.id as string,
  };
}

export async function hasTargetProfile(userId: string): Promise<boolean> {
  const stored = await getTargetProfile(userId);
  return stored !== null;
}
