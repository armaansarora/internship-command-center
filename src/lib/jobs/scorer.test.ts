import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TargetProfileSchema } from "@/lib/agents/cro/target-profile";
import type { SourceJob } from "./types";
import { cosineSimilarity, rankJobs, scoreJob } from "./scorer";

function unitVector(dim: number, seed: number): number[] {
  const v: number[] = [];
  for (let i = 0; i < dim; i++) {
    v.push(Math.sin(seed + i * 0.37));
  }
  const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0));
  return v.map((x) => x / norm);
}

/**
 * Orthogonal unit vector at the given axis — used when we need a truly low
 * cosine similarity against another axis-aligned vector.
 */
function axisUnit(dim: number, axis: number): number[] {
  const v = new Array<number>(dim).fill(0);
  v[axis % dim] = 1;
  return v;
}

function makeJob(overrides: Partial<SourceJob> = {}): SourceJob {
  return {
    sourceName: "seed",
    sourceId: "seed:test:1",
    company: "Stripe",
    role: "Software Engineer Intern",
    url: "https://stripe.com/jobs/listing/1",
    location: "New York, NY",
    department: "Payments",
    description: "Payments infra intern in NYC.",
    postedAt: new Date("2026-04-01").toISOString(),
    ...overrides,
  };
}

describe("scorer", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
    Object.assign(process.env, { NODE_ENV: "development" });
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
  });

  describe("cosineSimilarity", () => {
    it("returns 0 for nulls or mismatched vectors", () => {
      expect(cosineSimilarity(null, null)).toBe(0);
      expect(cosineSimilarity([1, 0, 0], null)).toBe(0);
      expect(cosineSimilarity([1, 0, 0], [1, 0])).toBe(0);
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it("returns 1 for identical unit vectors", () => {
      const v = unitVector(16, 42);
      expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
    });

    it("returns ~0 for orthogonal vectors", () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
    });

    it("returns 0 when either vector has zero norm", () => {
      expect(cosineSimilarity([0, 0, 0], [1, 1, 1])).toBe(0);
    });
  });

  describe("scoreJob", () => {
    const target = TargetProfileSchema.parse({
      roles: ["Software Engineer"],
      level: ["intern"],
      companies: ["Stripe"],
      geos: ["New York"],
      musts: [],
      nices: [],
    });
    const targetEmb = axisUnit(32, 0);
    const matchingJobEmb = axisUnit(32, 0);
    const orthogonalJobEmb = axisUnit(32, 7);

    it("high cosine + role + geo + company + top tier = near 1", () => {
      const result = scoreJob({
        target,
        targetEmbedding: targetEmb,
        job: makeJob(),
        jobEmbedding: matchingJobEmb,
      });
      expect(result.score).toBeGreaterThan(0.9);
      expect(result.signals.roleMatch).toBe(true);
      expect(result.signals.geoMatch).toBe(true);
      expect(result.signals.companyMatch).toBe(true);
      expect(result.signals.topTier).toBe(true);
    });

    it("low cosine, wrong role, wrong company = low score", () => {
      const result = scoreJob({
        target,
        targetEmbedding: targetEmb,
        job: makeJob({
          company: "RandomCorp",
          role: "Marketing Manager",
          location: "Austin, TX",
        }),
        jobEmbedding: orthogonalJobEmb,
      });
      expect(result.score).toBeLessThan(0.2);
      expect(result.signals.roleMatch).toBe(false);
      expect(result.signals.geoMatch).toBe(false);
      expect(result.signals.companyMatch).toBe(false);
      expect(result.signals.topTier).toBe(false);
    });

    it("remote-friendly target + remote-listed job triggers remoteFriendly", () => {
      const remoteTarget = TargetProfileSchema.parse({
        roles: ["Software Engineer"],
        level: ["intern"],
        geos: ["Remote"],
      });
      const result = scoreJob({
        target: remoteTarget,
        targetEmbedding: targetEmb,
        job: makeJob({ location: "Remote (Americas)" }),
        jobEmbedding: matchingJobEmb,
      });
      expect(result.signals.remoteFriendly).toBe(true);
      expect(result.signals.geoMatch).toBe(true);
    });

    it("score is clamped to [0, 1]", () => {
      const result = scoreJob({
        target,
        targetEmbedding: targetEmb,
        job: makeJob(),
        jobEmbedding: matchingJobEmb,
      });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it("tier override is respected over name lookup", () => {
      const result = scoreJob({
        target,
        targetEmbedding: targetEmb,
        job: makeJob({ company: "Stripe" }),
        jobEmbedding: matchingJobEmb,
        companyTierOverride: 5,
      });
      expect(result.tier).toBe(5);
      expect(result.signals.topTier).toBe(false);
    });

    it("rationale string captures components", () => {
      const result = scoreJob({
        target,
        targetEmbedding: targetEmb,
        job: makeJob(),
        jobEmbedding: matchingJobEmb,
      });
      const joined = result.rationale.join("|");
      expect(joined).toContain("semantic:");
      expect(joined).toContain("role+");
      expect(joined).toContain("tier1×");
    });
  });

  describe("rankJobs", () => {
    const target = TargetProfileSchema.parse({
      roles: ["Software Engineer"],
      level: ["intern"],
      geos: ["New York"],
    });
    const targetEmb = unitVector(16, 7);

    it("returns jobs in descending score order", () => {
      const candidates = [
        { job: makeJob({ sourceId: "a", company: "Stripe", role: "Software Engineer" }), jobEmbedding: unitVector(16, 7) },
        { job: makeJob({ sourceId: "b", company: "RandomCo", role: "Marketing Manager", location: "Mars" }), jobEmbedding: unitVector(16, 999) },
        { job: makeJob({ sourceId: "c", company: "Vercel", role: "Software Engineer", location: "New York, NY" }), jobEmbedding: unitVector(16, 8) },
      ];
      const ranked = rankJobs(target, targetEmb, candidates);
      expect(ranked.map((r) => r.job.sourceId)).toEqual(["a", "c", "b"]);
      expect(ranked[0].score.score).toBeGreaterThan(ranked[1].score.score);
      expect(ranked[1].score.score).toBeGreaterThan(ranked[2].score.score);
    });

    it("returns an empty array on empty input", () => {
      expect(rankJobs(target, targetEmb, [])).toEqual([]);
    });
  });
});
