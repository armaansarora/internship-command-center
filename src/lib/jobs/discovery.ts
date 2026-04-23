/**
 * Job Discovery orchestrator — the entry point called by both the CRO's
 * on-demand `runJobDiscovery` tool and the `/api/cron/job-discovery` worker.
 *
 * Contract:
 *   runJobDiscoveryForUser(userId) →
 *     1. Load target profile from agent_memory (early-return if none).
 *     2. Gather SourceJob candidates from Greenhouse + Lever for each
 *        declared target company, plus the seed library (always on).
 *     3. Dedupe by sourceId against existing `applications`.
 *     4. Batch-embed descriptions via text-embedding-3-small.
 *     5. Score + rank with scoreJob + tierWeight.
 *     6. For each candidate above MIN_SCORE_THRESHOLD:
 *        - pgvector similarity check against job_embeddings (>= 0.85 = dup)
 *        - insert application + embedding
 *     7. Return a summary the CRO can report back to the user.
 *
 * Non-goals:
 *   - Writing to agent_memory (R1.4 — CROWhiteboard reads current state).
 *   - Kicking off CMO tailoring (R1.7 — CEO dispatch).
 */
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { getTargetProfile } from "@/lib/agents/cro/target-profile";
import type { TargetProfile } from "@/lib/agents/cro/target-profile";
import { fetchGreenhouseBoard } from "./sources/greenhouse";
import { fetchLeverAccount } from "./sources/lever";
import { loadSeedJobs } from "./sources/seed";
import { rankJobs, type RankedJob } from "./scorer";
import { getCompanyTier, normalizeCompany } from "./company-tiers";
import {
  existsBySourceId,
  findSimilarJobByEmbedding,
  insertDiscoveredApplication,
} from "@/lib/db/queries/job-discovery-rest";
import type { SourceJob } from "./types";
import { log } from "@/lib/logger";

const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small");

export const DISCOVERY_MIN_SCORE = 0.45;
export const DISCOVERY_MAX_NEW_PER_RUN = 10;
export const DISCOVERY_DUP_THRESHOLD = 0.85;
const SOURCE_FETCH_LIMIT_PER_BOARD = 30;

export interface DiscoveryOptions {
  /** Soft cap on new applications inserted per run (default 10). */
  maxNew?: number;
  /** Minimum score threshold (default 0.45). */
  minScore?: number;
  /** Injected clock for deterministic tests. */
  now?: Date;
  /** If true, skip external fetches entirely (seed only). */
  seedOnly?: boolean;
  /** Optional user-provided company boards override. */
  companyBoardsOverride?: string[];
}

export interface DiscoveryRunResult {
  userId: string;
  hadTargetProfile: boolean;
  candidatesSeen: number;
  candidatesAfterSourceDedupe: number;
  newApplications: number;
  skippedDuplicates: number;
  topScore: number | null;
  topRoles: Array<{
    role: string;
    company: string;
    score: number;
    sourceId: string;
  }>;
  sourceWarnings: string[];
}

/**
 * Gather raw candidate jobs from all configured sources for a target profile.
 * Dedupes by sourceId in-memory so one JD listed on two boards doesn't score
 * twice.
 */
export async function gatherCandidatesFromSources(
  target: TargetProfile,
  opts: Pick<DiscoveryOptions, "seedOnly" | "now" | "companyBoardsOverride"> = {}
): Promise<{ jobs: SourceJob[]; warnings: string[] }> {
  const warnings: string[] = [];
  const aggregated = new Map<string, SourceJob>();
  const seeds = loadSeedJobs(opts.now);
  for (const j of seeds) aggregated.set(j.sourceId, j);

  if (!opts.seedOnly) {
    const boards =
      opts.companyBoardsOverride ??
      target.companies
        .map((c) => normalizeCompany(c))
        .filter(Boolean)
        .map((c) => c.replace(/\s+/g, ""));
    const unique = [...new Set(boards)];

    const fetches = unique.flatMap((board) => [
      fetchGreenhouseBoard(board, { limit: SOURCE_FETCH_LIMIT_PER_BOARD }),
      fetchLeverAccount(board, { limit: SOURCE_FETCH_LIMIT_PER_BOARD }),
    ]);
    const results = await Promise.allSettled(fetches);
    for (const r of results) {
      if (r.status === "fulfilled") {
        for (const j of r.value.jobs) aggregated.set(j.sourceId, j);
        warnings.push(...r.value.warnings);
      } else {
        warnings.push(
          `source fetch rejected: ${
            r.reason instanceof Error ? r.reason.message : String(r.reason)
          }`
        );
      }
    }
  }

  return { jobs: [...aggregated.values()], warnings };
}

/**
 * Embed a list of SourceJob descriptions in a single OpenAI call.
 */
async function embedCandidates(
  jobs: SourceJob[]
): Promise<Map<string, number[]>> {
  if (jobs.length === 0) return new Map();
  const texts = jobs.map(
    (j) => `${j.role}\nCompany: ${j.company}\n${j.description}`
  );
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: texts,
  });
  const out = new Map<string, number[]>();
  jobs.forEach((j, i) => out.set(j.sourceId, embeddings[i]));
  return out;
}

/**
 * Main orchestrator. Called by the CRO tool and the cron worker.
 */
export async function runJobDiscoveryForUser(
  userId: string,
  options: DiscoveryOptions = {}
): Promise<DiscoveryRunResult> {
  const maxNew = options.maxNew ?? DISCOVERY_MAX_NEW_PER_RUN;
  const minScore = options.minScore ?? DISCOVERY_MIN_SCORE;

  const baseResult = (
    partial: Partial<DiscoveryRunResult>
  ): DiscoveryRunResult => ({
    userId,
    hadTargetProfile: false,
    candidatesSeen: 0,
    candidatesAfterSourceDedupe: 0,
    newApplications: 0,
    skippedDuplicates: 0,
    topScore: null,
    topRoles: [],
    sourceWarnings: [],
    ...partial,
  });

  const stored = await getTargetProfile(userId);
  if (!stored) {
    log.info("job_discovery.no_profile", { userId });
    return baseResult({ hadTargetProfile: false });
  }

  const { jobs: gathered, warnings } = await gatherCandidatesFromSources(
    stored.profile,
    {
      seedOnly: options.seedOnly,
      now: options.now,
      companyBoardsOverride: options.companyBoardsOverride,
    }
  );

  // Source-level dedupe — skip anything we already ingested.
  const freshJobs: SourceJob[] = [];
  for (const job of gathered) {
    const exists = await existsBySourceId(userId, job.sourceId);
    if (!exists) freshJobs.push(job);
  }

  if (freshJobs.length === 0) {
    return baseResult({
      hadTargetProfile: true,
      candidatesSeen: gathered.length,
      candidatesAfterSourceDedupe: 0,
      sourceWarnings: warnings,
    });
  }

  let embeddingMap: Map<string, number[]>;
  try {
    embeddingMap = await embedCandidates(freshJobs);
  } catch (err) {
    log.error("job_discovery.embed_batch_failed", err, {
      userId,
      candidateCount: freshJobs.length,
    });
    return baseResult({
      hadTargetProfile: true,
      candidatesSeen: gathered.length,
      candidatesAfterSourceDedupe: freshJobs.length,
      sourceWarnings: [
        ...warnings,
        `embed batch failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      ],
    });
  }

  const embedded = freshJobs
    .map((job) => ({ job, jobEmbedding: embeddingMap.get(job.sourceId) }))
    .filter(
      (x): x is { job: SourceJob; jobEmbedding: number[] } =>
        Array.isArray(x.jobEmbedding)
    );

  const ranked: RankedJob[] = rankJobs(
    stored.profile,
    stored.embedding,
    embedded
  );

  let newApplications = 0;
  let skippedDuplicates = 0;
  const topRoles: DiscoveryRunResult["topRoles"] = [];

  for (const candidate of ranked) {
    if (newApplications >= maxNew) break;
    if (candidate.score.score < minScore) break;

    // pgvector-based paraphrase dedupe — catches the same JD posted on two boards.
    const dup = await findSimilarJobByEmbedding(
      userId,
      candidate.jobEmbedding,
      DISCOVERY_DUP_THRESHOLD
    );
    if (dup) {
      skippedDuplicates += 1;
      continue;
    }

    const inserted = await insertDiscoveredApplication(userId, {
      sourceJob: candidate.job,
      matchScore: candidate.score.score,
      tier: candidate.score.tier,
      embedding: candidate.jobEmbedding,
    });
    if (!inserted) continue;

    newApplications += 1;
    topRoles.push({
      role: candidate.job.role,
      company: candidate.job.company,
      score: Number(candidate.score.score.toFixed(3)),
      sourceId: candidate.job.sourceId,
    });
  }

  const topScore = ranked[0]?.score.score ?? null;

  log.info("job_discovery.run_complete", {
    userId,
    candidatesSeen: gathered.length,
    freshAfterDedupe: freshJobs.length,
    newApplications,
    skippedDuplicates,
    topScore,
  });

  return {
    userId,
    hadTargetProfile: true,
    candidatesSeen: gathered.length,
    candidatesAfterSourceDedupe: freshJobs.length,
    newApplications,
    skippedDuplicates,
    topScore,
    topRoles,
    sourceWarnings: warnings,
  };
}

// For test injection: allow explicit tier lookups if needed.
export { getCompanyTier };
