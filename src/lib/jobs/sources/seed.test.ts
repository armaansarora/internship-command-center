import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fetchSeedJobs, loadSeedJobs } from "./seed";

describe("seed source", () => {
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

  it("returns at least 20 deterministic seed jobs", () => {
    const jobs = loadSeedJobs(new Date("2026-04-22T00:00:00Z"));
    expect(jobs.length).toBeGreaterThanOrEqual(20);
    expect(new Set(jobs.map((j) => j.sourceId)).size).toBe(jobs.length);
  });

  it("sourceIds are stable and source-prefixed", () => {
    const jobs = loadSeedJobs(new Date("2026-04-22T00:00:00Z"));
    expect(jobs.every((j) => j.sourceId.startsWith("seed:"))).toBe(true);
    expect(jobs.every((j) => j.sourceName === "seed")).toBe(true);
  });

  it("postedAt is anchored to the provided clock", () => {
    const now = new Date("2026-04-22T00:00:00Z");
    const jobs = loadSeedJobs(now);
    for (const j of jobs) {
      expect(j.postedAt).not.toBeNull();
      const postedMs = new Date(j.postedAt!).getTime();
      expect(postedMs).toBeLessThanOrEqual(now.getTime());
      expect(postedMs).toBeGreaterThanOrEqual(now.getTime() - 60 * 86_400_000);
    }
  });

  it("every job has the fields the embedder and scorer depend on", () => {
    const jobs = loadSeedJobs();
    for (const j of jobs) {
      expect(j.company).toBeTruthy();
      expect(j.role).toBeTruthy();
      expect(j.url).toMatch(/^https?:/);
      expect(j.description.length).toBeGreaterThan(40);
      expect(j.description.length).toBeLessThanOrEqual(8_000);
    }
  });

  it("fetchSeedJobs wraps loadSeedJobs in the adapter contract", async () => {
    const result = await fetchSeedJobs(new Date("2026-04-22T00:00:00Z"));
    expect(result.source).toBe("seed");
    expect(result.warnings).toEqual([]);
    expect(result.jobs.length).toBeGreaterThan(0);
  });
});
