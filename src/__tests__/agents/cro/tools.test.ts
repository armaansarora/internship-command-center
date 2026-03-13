import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

describe("CRO Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queryApplications returns pipeline data", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: "app-1", status: "applied", tier: 1, role: "Analyst" },
          ]),
        }),
      }),
    });

    const { queryApplications } = await import("@/lib/agents/cro/tools");
    const result = await queryApplications({ limit: 50 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("analyzeConversionRates returns rate data", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { status: "applied" },
          { status: "applied" },
          { status: "interview_scheduled" },
          { status: "offer" },
        ]),
      }),
    });

    const { analyzeConversionRates } = await import("@/lib/agents/cro/tools");
    const result = await analyzeConversionRates({});
    expect(result).toHaveProperty("totalApplications");
    expect(result).toHaveProperty("conversionRates");
  });
});

describe("searchJobs", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.JSEARCH_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JSEARCH_API_KEY = "test-api-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.JSEARCH_API_KEY = originalEnv;
  });

  it("calls JSearch API and returns jobs", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              job_title: "Software Engineer Intern",
              employer_name: "Google",
              job_city: "Mountain View",
              job_state: "CA",
              job_apply_link: "https://google.com/apply",
              job_posted_at_datetime_utc: "2026-03-10T00:00:00Z",
              job_description: "A great opportunity for an intern.",
            },
          ],
        }),
    }) as typeof fetch;

    const { searchJobs } = await import("@/lib/agents/cro/tools");
    const result = await searchJobs({ query: "software intern" });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].title).toBe("Software Engineer Intern");
    expect(result.jobs[0].company).toBe("Google");
    expect(result.jobs[0].location).toBe("Mountain View, CA");
    expect(result.jobs[0].url).toBe("https://google.com/apply");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("jsearch.p.rapidapi.com"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-RapidAPI-Key": "test-api-key",
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        }),
      })
    );
  });

  it("throws when JSEARCH_API_KEY is missing", async () => {
    delete process.env.JSEARCH_API_KEY;

    const { searchJobs } = await import("@/lib/agents/cro/tools");
    await expect(searchJobs({ query: "intern" })).rejects.toThrow(
      "JSEARCH_API_KEY"
    );
  });
});

describe("lookupAtsJob", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns Lever jobs", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "lever-123",
            text: "Product Manager Intern",
            categories: { location: "San Francisco, CA", team: "Product" },
            hostedUrl: "https://jobs.lever.co/acme/lever-123",
          },
        ]),
    }) as typeof fetch;

    const { lookupAtsJob } = await import("@/lib/agents/cro/tools");
    const result = await lookupAtsJob({
      company: "Acme Corp",
      atsType: "lever",
    });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].id).toBe("lever-123");
    expect(result.jobs[0].title).toBe("Product Manager Intern");
    expect(result.jobs[0].location).toBe("San Francisco, CA");
    expect(result.jobs[0].team).toBe("Product");
  });

  it("returns Greenhouse jobs", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jobs: [
            {
              id: 456789,
              title: "Data Science Intern",
              location: { name: "New York, NY" },
              absolute_url: "https://boards.greenhouse.io/acme/jobs/456789",
              departments: [{ name: "Data" }],
            },
          ],
        }),
    }) as typeof fetch;

    const { lookupAtsJob } = await import("@/lib/agents/cro/tools");
    const result = await lookupAtsJob({
      company: "Acme",
      atsType: "greenhouse",
    });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].id).toBe("456789");
    expect(result.jobs[0].title).toBe("Data Science Intern");
    expect(result.jobs[0].location).toBe("New York, NY");
    expect(result.jobs[0].team).toBe("Data");
  });

  it("returns empty array on API failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as typeof fetch;

    const { lookupAtsJob } = await import("@/lib/agents/cro/tools");
    const result = await lookupAtsJob({
      company: "NonExistent",
      atsType: "lever",
    });

    expect(result.jobs).toEqual([]);
  });
});
