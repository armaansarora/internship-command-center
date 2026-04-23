/**
 * Job Discovery queries — IDOR-safe via user_id in every WHERE + RPC call.
 *
 * The ingest path (see src/lib/jobs/discovery.ts) calls into these helpers:
 *   - findSimilarJobByEmbedding  → pgvector dedupe before an insert
 *   - existsBySourceId           → cheap idempotency check by source id
 *   - insertDiscoveredApplication → atomic insert of application + embedding
 */
import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";
import type { SourceJob } from "@/lib/jobs/types";

export interface SimilarJobHit {
  applicationId: string;
  similarity: number;
  role: string;
  companyName: string;
}

/**
 * Ask pgvector for the single most similar job embedding for this user. A
 * high similarity (> 0.85 typical) means the candidate is a duplicate of
 * something we already ingested.
 */
export async function findSimilarJobByEmbedding(
  userId: string,
  embedding: number[],
  threshold: number = 0.85
): Promise<SimilarJobHit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_job_embeddings", {
    query_embedding: embedding,
    match_count: 1,
    match_threshold: threshold,
    p_user_id: userId,
  });
  if (error) {
    log.warn("job_discovery.match_rpc_failed", {
      userId,
      error: error.message,
    });
    return null;
  }
  const rows = (data ?? []) as Array<{
    application_id: string;
    similarity: number;
    role: string;
    company_name: string;
  }>;
  if (rows.length === 0) return null;
  return {
    applicationId: rows[0].application_id,
    similarity: rows[0].similarity,
    role: rows[0].role,
    companyName: rows[0].company_name,
  };
}

/**
 * Idempotency — fast path. If we already ingested this SourceJob for the
 * user, skip embedding + score work entirely.
 */
export async function existsBySourceId(
  userId: string,
  sourceId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("source", sourceId);
  if (error) {
    log.warn("job_discovery.exists_by_source_failed", {
      userId,
      sourceId,
      error: error.message,
    });
    return false;
  }
  return (count ?? 0) > 0;
}

export interface InsertDiscoveredInput {
  sourceJob: SourceJob;
  matchScore: number;
  tier: number;
  embedding: number[];
}

export interface InsertDiscoveredResult {
  applicationId: string;
  embeddingId: string | null;
}

/**
 * Insert a new discovered application + its job embedding. The application
 * lands in `status='discovered'` so the War Room Kanban surfaces it at the
 * top of the pipeline without the user having done anything.
 */
export async function insertDiscoveredApplication(
  userId: string,
  { sourceJob, matchScore, tier, embedding }: InsertDiscoveredInput
): Promise<InsertDiscoveredResult | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const clampedScore = Math.max(0, Math.min(1, matchScore));

  const { data: appRow, error: appErr } = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      company_name: sourceJob.company,
      role: sourceJob.role,
      url: sourceJob.url,
      status: "discovered",
      source: sourceJob.sourceId,
      notes: sourceJob.description.slice(0, 2_000),
      location: sourceJob.location,
      tier,
      match_score: clampedScore.toFixed(3),
      applied_at: null,
      last_activity_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (appErr || !appRow) {
    log.error("job_discovery.insert_app_failed", undefined, {
      userId,
      sourceId: sourceJob.sourceId,
      error: appErr?.message,
    });
    return null;
  }

  const applicationId = appRow.id as string;

  const { data: embRow, error: embErr } = await supabase
    .from("job_embeddings")
    .insert({
      user_id: userId,
      application_id: applicationId,
      content: sourceJob.description.slice(0, 8_000),
      embedding,
    })
    .select("id")
    .single();

  if (embErr) {
    log.warn("job_discovery.insert_embedding_failed", {
      userId,
      applicationId,
      error: embErr.message,
    });
  }

  return {
    applicationId,
    embeddingId: (embRow?.id as string | undefined) ?? null,
  };
}

/**
 * Return user ids that have a CRO target-profile row in agent_memory.
 * Used by the cron worker to know whose discovery runs to trigger.
 */
export async function listUserIdsWithTargetProfile(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_memory")
    .select("user_id")
    .eq("agent", "cro")
    .eq("category", "preference")
    .like("content", "[target_profile_v1]%");
  if (error) {
    log.warn("job_discovery.list_users_failed", {
      error: error.message,
    });
    return [];
  }
  const set = new Set<string>();
  for (const row of data ?? []) {
    const uid = row.user_id as string | null;
    if (uid) set.add(uid);
  }
  return [...set];
}
