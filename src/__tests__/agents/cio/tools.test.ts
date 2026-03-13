import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("CIO Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("TAVILY_API_KEY", "test-tavily-key");
    vi.stubEnv("FIRECRAWL_API_KEY", "test-firecrawl-key");
    vi.stubEnv("FRED_API_KEY", "test-fred-key");
  });

  it("searchCompany calls Tavily and returns results", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            title: "Acme Corp",
            url: "https://acme.com",
            content: "Leading tech company",
          },
        ],
      }),
    });

    const { searchCompany } = await import("@/lib/agents/cio/tools");
    const result = await searchCompany({ query: "Acme Corp" });

    expect(mockFetch).toHaveBeenCalledWith("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: "test-tavily-key",
        query: "Acme Corp",
        max_results: 5,
        search_depth: "advanced",
        include_answer: true,
      }),
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual({
      title: "Acme Corp",
      url: "https://acme.com",
      content: "Leading tech company",
    });
  });

  it("searchCompany throws when TAVILY_API_KEY is empty", async () => {
    vi.stubEnv("TAVILY_API_KEY", "");
    vi.resetModules();

    const { searchCompany } = await import("@/lib/agents/cio/tools");
    await expect(searchCompany({ query: "test" })).rejects.toThrow(
      "TAVILY_API_KEY is not set"
    );
  });

  it("getEconomicData calls FRED with correct params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        observations: [
          { date: "2026-01-01", value: "3.5" },
          { date: "2025-12-01", value: "3.4" },
        ],
      }),
    });

    const { getEconomicData } = await import("@/lib/agents/cio/tools");
    const result = await getEconomicData({
      seriesId: "UNRATE",
      limit: 2,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://api.stlouisfed.org/fred/series/observations"
      )
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("series_id=UNRATE")
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("api_key=test-fred-key")
    );
    expect(result.observations).toHaveLength(2);
  });

  it("upsertCompany creates new when not found", async () => {
    // First select (by domain) returns empty
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    // Insert returns new id
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "new-company-id" }]),
      }),
    });

    const { upsertCompany } = await import("@/lib/agents/cio/tools");
    const result = await upsertCompany({
      name: "Acme Corp",
      domain: "acme.com",
      industry: "Technology",
    });

    expect(result.created).toBe(true);
    expect(result.companyId).toBe("new-company-id");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("upsertCompany updates existing company", async () => {
    // First select (by domain) returns existing
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: "existing-id" }]),
        }),
      }),
    });

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const { upsertCompany } = await import("@/lib/agents/cio/tools");
    const result = await upsertCompany({
      name: "Acme Corp",
      domain: "acme.com",
      description: "Updated description",
    });

    expect(result.created).toBe(false);
    expect(result.companyId).toBe("existing-id");
    expect(mockUpdate).toHaveBeenCalled();
  });
});
