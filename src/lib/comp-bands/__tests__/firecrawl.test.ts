import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scrapeLevelsFyi, buildLevelsFyiUrl } from "../firecrawl";

describe("comp-bands/firecrawl", () => {
  beforeEach(() => {
    vi.stubEnv("FIRECRAWL_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("buildLevelsFyiUrl produces the expected canonical URL", () => {
    const url = buildLevelsFyiUrl({
      company: "Meta",
      role: "Software Engineer",
      location: "New York, NY",
    });
    expect(url).toMatch(/levels\.fyi\/companies\/meta\/salaries\/software-engineer/i);
  });

  it("returns null when Firecrawl HTTP call fails (500)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );
    const out = await scrapeLevelsFyi("Meta", "Software Engineer", "NYC");
    expect(out).toBeNull();
  });

  it("returns null when Firecrawl markdown has no salary data", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { markdown: "No data yet for this role." },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const out = await scrapeLevelsFyi("Meta", "Software Engineer", "NYC");
    expect(out).toBeNull();
  });

  it("parses a realistic markdown snippet into percentile bands", async () => {
    const markdown = `
      ## Software Engineer at Meta, New York
      25th percentile: $180,000
      Median: $220,000
      75th percentile: $280,000
      Bonus: 25,000 / 40,000 / 60,000
      Equity: 80000 / 120000 / 200000
      Sample size: 312
    `;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { markdown } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const out = await scrapeLevelsFyi("Meta", "Software Engineer", "New York, NY");
    expect(out).not.toBeNull();
    expect(out!.basePercentiles.p50).toBe(220000);
    expect(out!.basePercentiles.p25).toBe(180000);
    expect(out!.basePercentiles.p75).toBe(280000);
    expect(out!.sampleSize).toBe(312);
  });
});
