/**
 * Job scorer — turns a candidate job posting into a 0-1 match score relative
 * to the user's TargetProfile.
 *
 * Scoring components (all clipped to reasonable ranges, combined, then clamped
 * to [0, 1]):
 *   base:   cosine(target_embedding, job_embedding)     — 0 to ~1
 *   role:   +0.10 substring match on any target role    — acts as a boost
 *           -0.10 when none match                       — acts as a drag
 *   geo:    +0.07 location contains any target geo,
 *           +0.05 if either target or job implies "remote"
 *   comp:   +0.08 company name matches target companies list
 *   tier:   × tierWeight(companyTier) on the combined pre-clip score
 *
 * The rationale array captures why a score landed where it did so the CRO
 * whiteboard and UI can show an honest "why this deal" string.
 */
import type { SourceJob } from "./types";
import type { TargetProfile } from "@/lib/agents/cro/target-profile";
import { getCompanyTier, normalizeCompany, tierWeight } from "./company-tiers";

export interface ScoreInput {
  target: TargetProfile;
  /** Target-profile embedding (from agent_memory). */
  targetEmbedding: number[] | null;
  job: SourceJob;
  /** Job-description embedding (generated per candidate). */
  jobEmbedding: number[] | null;
  /** Optional override; defaults to company-tier lookup. */
  companyTierOverride?: number;
}

export interface ScoreResult {
  score: number;
  cosine: number;
  tier: number;
  rationale: string[];
  /** Convenience booleans the UI can render as tags. */
  signals: {
    roleMatch: boolean;
    geoMatch: boolean;
    companyMatch: boolean;
    remoteFriendly: boolean;
    topTier: boolean;
  };
}

export function cosineSimilarity(
  a: number[] | null,
  b: number[] | null
): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

function lowerSet(strings: string[]): Set<string> {
  const out = new Set<string>();
  for (const s of strings) {
    const trimmed = s.toLowerCase().trim();
    if (trimmed) out.add(trimmed);
  }
  return out;
}

function hasAnySubstring(
  haystack: string,
  needles: Iterable<string>
): boolean {
  const h = haystack.toLowerCase();
  for (const n of needles) {
    if (n && h.includes(n)) return true;
  }
  return false;
}

export function scoreJob({
  target,
  targetEmbedding,
  job,
  jobEmbedding,
  companyTierOverride,
}: ScoreInput): ScoreResult {
  const rationale: string[] = [];

  const cosine = Math.max(0, cosineSimilarity(targetEmbedding, jobEmbedding));
  rationale.push(`semantic:${cosine.toFixed(3)}`);

  const roleNeedles = lowerSet(target.roles);
  const roleMatch = hasAnySubstring(job.role, roleNeedles);
  let roleDelta = 0;
  if (roleMatch) {
    roleDelta = 0.1;
    rationale.push("role+0.10");
  } else {
    roleDelta = -0.1;
    rationale.push("role-0.10");
  }

  const geoNeedles = lowerSet(target.geos);
  const locLower = (job.location ?? "").toLowerCase();
  const remoteFriendly =
    locLower.includes("remote") ||
    [...geoNeedles].some((g) => g.includes("remote"));
  const geoMatch = remoteFriendly || hasAnySubstring(locLower, geoNeedles);
  let geoDelta = 0;
  if (geoMatch) {
    geoDelta = remoteFriendly && !hasAnySubstring(locLower, geoNeedles) ? 0.05 : 0.07;
    rationale.push(`geo+${geoDelta.toFixed(2)}`);
  }

  const companyNeedles = new Set<string>(
    target.companies.map((c) => normalizeCompany(c)).filter(Boolean)
  );
  const companyMatch = companyNeedles.has(normalizeCompany(job.company));
  const companyDelta = companyMatch ? 0.08 : 0;
  if (companyMatch) rationale.push("company+0.08");

  const tier = companyTierOverride ?? getCompanyTier(job.company);
  const w = tierWeight(tier);
  rationale.push(`tier${tier}×${w.toFixed(2)}`);

  const preTier = cosine + roleDelta + geoDelta + companyDelta;
  const combined = preTier * w;
  const score = Math.max(0, Math.min(1, combined));

  return {
    score,
    cosine,
    tier,
    rationale,
    signals: {
      roleMatch,
      geoMatch,
      companyMatch,
      remoteFriendly,
      topTier: tier === 1,
    },
  };
}

export interface RankedJob {
  job: SourceJob;
  score: ScoreResult;
  jobEmbedding: number[];
}

/**
 * Rank a batch of embedded candidates against a single target profile.
 * Returns in descending score order.
 */
export function rankJobs(
  target: TargetProfile,
  targetEmbedding: number[] | null,
  embeddedJobs: Array<{ job: SourceJob; jobEmbedding: number[] }>,
  companyTierLookup?: (company: string) => number
): RankedJob[] {
  const ranked = embeddedJobs.map(({ job, jobEmbedding }) => ({
    job,
    jobEmbedding,
    score: scoreJob({
      target,
      targetEmbedding,
      job,
      jobEmbedding,
      companyTierOverride: companyTierLookup?.(job.company),
    }),
  }));
  ranked.sort((a, b) => b.score.score - a.score.score);
  return ranked;
}
