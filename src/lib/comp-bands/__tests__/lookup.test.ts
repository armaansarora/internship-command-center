import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * lookupCompBands resolver tests.
 *
 * Covers the four flows from design-doc §4.5:
 *   1. Cache hit  → returns {ok:true, fromCache:true} and never scrapes.
 *   2. No API key → returns {ok:false, reason:"no_key"}.
 *   3. Over budget → returns {ok:false, reason:"over_budget"}, never scrapes.
 *   4. Scrape success → increments budget, writes cache, returns
 *      {ok:true, fromCache:false} with the fresh percentiles.
 *
 * Mocks the firecrawl scraper, the budget helpers, and the comp-bands REST
 * layer so the test exercises ONLY the resolver's control flow.
 */

const { scrapeSpy, cachedSpy, upsertSpy, canScrapeSpy, incSpy } = vi.hoisted(() => ({
  scrapeSpy: vi.fn(),
  cachedSpy: vi.fn(),
  upsertSpy: vi.fn(),
  canScrapeSpy: vi.fn(),
  incSpy: vi.fn(),
}));

vi.mock("../firecrawl", () => ({
  scrapeLevelsFyi: scrapeSpy,
}));

vi.mock("@/lib/db/queries/comp-bands-rest", () => ({
  getCachedBands: cachedSpy,
  upsertBands: upsertSpy,
}));

vi.mock("../budget", () => ({
  canScrapeThisMonth: canScrapeSpy,
  incrementScrapeCount: incSpy,
}));

const { lookupCompBands } = await import("../lookup");

const userClient = { tag: "user" } as never;
const admin = { tag: "admin" } as never;

describe("comp-bands/lookup", () => {
  beforeEach(() => {
    scrapeSpy.mockReset();
    cachedSpy.mockReset();
    upsertSpy.mockReset();
    canScrapeSpy.mockReset();
    incSpy.mockReset();
    vi.stubEnv("FIRECRAWL_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("cache hit returns fromCache=true and never scrapes", async () => {
    cachedSpy.mockResolvedValueOnce({
      id: "bands-1",
      company_name_normalized: "meta platforms",
      role: "Software Engineer",
      location: "New York, NY",
      level: "",
      base_p25: 180000,
      base_p50: 220000,
      base_p75: 280000,
      bonus_p25: 25000,
      bonus_p50: 40000,
      bonus_p75: 60000,
      equity_p25: 80000,
      equity_p50: 120000,
      equity_p75: 200000,
      sample_size: 312,
      source: "levels.fyi",
      scraped_at: "2026-04-20T00:00:00Z",
      expires_at: "2026-05-20T00:00:00Z",
    });

    const out = await lookupCompBands(userClient, admin, {
      company: "Meta Platforms Inc",
      role: "Software Engineer",
      location: "New York, NY",
    });

    expect(out).toMatchObject({
      ok: true,
      fromCache: true,
      base: { p25: 180000, p50: 220000, p75: 280000 },
      bonus: { p25: 25000, p50: 40000, p75: 60000 },
      equity: { p25: 80000, p50: 120000, p75: 200000 },
      sampleSize: 312,
      source: "levels.fyi",
    });
    expect(scrapeSpy).not.toHaveBeenCalled();
    expect(canScrapeSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("returns reason='no_key' when FIRECRAWL_API_KEY is unset and cache misses", async () => {
    vi.unstubAllEnvs();
    cachedSpy.mockResolvedValueOnce(null);

    const out = await lookupCompBands(userClient, admin, {
      company: "Meta",
      role: "Software Engineer",
      location: "NYC",
    });

    expect(out).toEqual({ ok: false, reason: "no_key" });
    expect(canScrapeSpy).not.toHaveBeenCalled();
    expect(scrapeSpy).not.toHaveBeenCalled();
  });

  it("returns reason='over_budget' when monthly ceiling is reached", async () => {
    cachedSpy.mockResolvedValueOnce(null);
    canScrapeSpy.mockResolvedValueOnce(false);

    const out = await lookupCompBands(userClient, admin, {
      company: "Meta",
      role: "Software Engineer",
      location: "NYC",
    });

    expect(out).toEqual({ ok: false, reason: "over_budget" });
    expect(scrapeSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(incSpy).not.toHaveBeenCalled();
  });

  it("scrape success increments budget, writes cache, returns fromCache=false", async () => {
    cachedSpy.mockResolvedValueOnce(null);
    canScrapeSpy.mockResolvedValueOnce(true);
    scrapeSpy.mockResolvedValueOnce({
      basePercentiles: { p25: 100000, p50: 130000, p75: 160000 },
      bonusPercentiles: { p25: 10000, p50: 15000, p75: 25000 },
      equityPercentiles: { p25: 20000, p50: 40000, p75: 80000 },
      sampleSize: 77,
    });

    const out = await lookupCompBands(userClient, admin, {
      company: "Acme Inc",
      role: "Data Analyst",
      location: "Chicago, IL",
      level: "L3",
    });

    expect(out).toMatchObject({
      ok: true,
      fromCache: false,
      base: { p25: 100000, p50: 130000, p75: 160000 },
      sampleSize: 77,
      source: "levels.fyi",
    });
    expect(incSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const upsertArg = upsertSpy.mock.calls[0][1] as {
      company_name_normalized: string;
      role: string;
      location: string;
      level: string;
      base_p50: number;
    };
    expect(upsertArg.company_name_normalized).toBe("acme");
    expect(upsertArg.role).toBe("Data Analyst");
    expect(upsertArg.level).toBe("L3");
    expect(upsertArg.base_p50).toBe(130000);
  });

  it("returns reason='empty' when scrape runs but parses nothing", async () => {
    cachedSpy.mockResolvedValueOnce(null);
    canScrapeSpy.mockResolvedValueOnce(true);
    scrapeSpy.mockResolvedValueOnce(null);

    const out = await lookupCompBands(userClient, admin, {
      company: "Nowhere Co",
      role: "Unknown Role",
      location: "Mars",
    });

    expect(out).toEqual({ ok: false, reason: "empty" });
    expect(incSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});
