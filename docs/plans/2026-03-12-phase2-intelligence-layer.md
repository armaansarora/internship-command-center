# Phase 2: Intelligence Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the three "input" departments (CIO, COO, CRO enhancement) that bring data INTO the system, plus the Research and Communications UI pages.

**Architecture:** Contract-first Zod schemas → Inngest-driven agents with AI SDK `generateText` + tool calls → Turso DB writes → SSE event streaming to browser. Exact same pattern as Phase 1 CRO vertical slice. No direct agent-to-agent calls — all data sharing via Turso.

**Tech Stack:** Next.js 16, Vercel AI SDK v4.x, Inngest, Drizzle ORM + Turso, Zod v4, Tavily/Firecrawl/SEC EDGAR/FRED (CIO), Gmail/Calendar APIs (COO), JSearch/Lever/Greenhouse (CRO), shadcn/ui + Boardroom design system.

**Milestones:**
- M1: CIO Agent (Tasks 1-5)
- M2: COO Agent (Tasks 6-10)
- M3: CRO Enhancement (Tasks 11-13)
- M4: Research Page (Tasks 14-16)
- M5: Communications Page (Tasks 17-19)
- M6: CEO Integration + Final Verification (Tasks 20-21)

**Verify after each milestone:** `pnpm test && pnpm build`

---

## Milestone 1: CIO Agent — "The Library"

### Task 1: CIO Contract

**Files:**
- Create: `src/contracts/departments/cio.ts`
- Modify: `src/contracts/index.ts`
- Test: `src/__tests__/contracts/cio.test.ts`

**Step 1: Write contract schema**

```ts
// src/contracts/departments/cio.ts
import { z } from "zod/v4";

export const CioResultData = z.object({
  companyProfile: z.object({
    companyId: z.string(),
    name: z.string(),
    domain: z.string().optional(),
    industry: z.string().optional(),
    sector: z.string().optional(),
    size: z.enum(["startup", "mid", "large", "enterprise"]).optional(),
    headquarters: z.string().optional(),
    description: z.string().optional(),
    cultureSummary: z.string().optional(),
    recentNews: z.string().optional(),
    financialsSummary: z.string().optional(),
    keyPeople: z.array(z.object({
      name: z.string(),
      title: z.string(),
      linkedinUrl: z.string().optional(),
    })).default([]),
    internshipIntel: z.string().optional(),
    careersUrl: z.string().optional(),
    linkedinUrl: z.string().optional(),
    glassdoorUrl: z.string().optional(),
  }),
  researchSources: z.array(z.object({
    source: z.enum(["tavily", "firecrawl", "sec_edgar", "fred", "manual"]),
    url: z.string().optional(),
    summary: z.string(),
    retrievedAt: z.string().datetime(),
  })).default([]),
  marketContext: z.object({
    industryTrends: z.string().optional(),
    economicIndicators: z.array(z.object({
      name: z.string(),
      value: z.string(),
      source: z.string(),
    })).default([]),
  }).optional(),
  confidence: z.number().min(0).max(100),
});

export const CioTools = {
  searchCompany: z.object({
    description: z.literal("Search for company information using Tavily"),
    parameters: z.object({
      query: z.string(),
      maxResults: z.number().default(5),
    }),
  }),
  scrapeUrl: z.object({
    description: z.literal("Scrape a specific URL for company data using Firecrawl"),
    parameters: z.object({
      url: z.string().url(),
      extractFields: z.array(z.string()).optional(),
    }),
  }),
  lookupSecFilings: z.object({
    description: z.literal("Look up SEC EDGAR filings for a public company"),
    parameters: z.object({
      companyName: z.string(),
      cik: z.string().optional(),
      filingType: z.enum(["10-K", "10-Q", "8-K", "DEF 14A"]).default("10-K"),
      limit: z.number().default(3),
    }),
  }),
  getEconomicData: z.object({
    description: z.literal("Get economic indicators from FRED API"),
    parameters: z.object({
      seriesId: z.string(),
      observationStart: z.string().optional(),
      limit: z.number().default(10),
    }),
  }),
  upsertCompany: z.object({
    description: z.literal("Create or update a company record in the database"),
    parameters: z.object({
      name: z.string(),
      domain: z.string().optional(),
      industry: z.string().optional(),
      sector: z.string().optional(),
      size: z.enum(["startup", "mid", "large", "enterprise"]).optional(),
      headquarters: z.string().optional(),
      description: z.string().optional(),
      cultureSummary: z.string().optional(),
      recentNews: z.string().optional(),
      financialsSummary: z.string().optional(),
      keyPeople: z.array(z.object({
        name: z.string(),
        title: z.string(),
        linkedinUrl: z.string().optional(),
      })).optional(),
      internshipIntel: z.string().optional(),
      careersUrl: z.string().optional(),
      linkedinUrl: z.string().optional(),
      glassdoorUrl: z.string().optional(),
    }),
  }),
} as const;
```

**Step 2: Write failing contract tests**

```ts
// src/__tests__/contracts/cio.test.ts
import { describe, it, expect } from "vitest";
import { CioResultData, CioTools } from "@/contracts/departments/cio";

describe("CioResultData", () => {
  it("parses valid research result", () => {
    const result = CioResultData.parse({
      companyProfile: {
        companyId: "c1",
        name: "Stripe",
        domain: "stripe.com",
        industry: "fintech",
      },
      researchSources: [{
        source: "tavily",
        summary: "Found company info",
        retrievedAt: "2026-03-12T10:00:00Z",
      }],
      confidence: 85,
    });
    expect(result.companyProfile.name).toBe("Stripe");
    expect(result.confidence).toBe(85);
  });

  it("applies defaults for optional arrays", () => {
    const result = CioResultData.parse({
      companyProfile: { companyId: "c1", name: "Acme" },
      confidence: 50,
    });
    expect(result.researchSources).toEqual([]);
    expect(result.companyProfile.keyPeople).toEqual([]);
  });

  it("rejects confidence out of range", () => {
    expect(() => CioResultData.parse({
      companyProfile: { companyId: "c1", name: "X" },
      confidence: 150,
    })).toThrow();
  });

  it("rejects invalid research source", () => {
    expect(() => CioResultData.parse({
      companyProfile: { companyId: "c1", name: "X" },
      researchSources: [{ source: "google", summary: "x", retrievedAt: "2026-03-12T10:00:00Z" }],
      confidence: 50,
    })).toThrow();
  });
});

describe("CioTools", () => {
  it("searchCompany has correct description literal", () => {
    const parsed = CioTools.searchCompany.shape.description.parse(
      "Search for company information using Tavily"
    );
    expect(parsed).toBe("Search for company information using Tavily");
  });

  it("scrapeUrl requires valid URL", () => {
    expect(() => CioTools.scrapeUrl.shape.parameters.parse({
      url: "not-a-url",
    })).toThrow();
  });

  it("lookupSecFilings defaults to 10-K", () => {
    const parsed = CioTools.lookupSecFilings.shape.parameters.parse({
      companyName: "Apple Inc",
    });
    expect(parsed.filingType).toBe("10-K");
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `cd /Users/armaanarora/Claude\ Code/internship-command-center && pnpm test src/__tests__/contracts/cio.test.ts`
Expected: FAIL (module not found)

**Step 4: Create the contract file (code from Step 1)**

**Step 5: Add exports to barrel**

```ts
// src/contracts/index.ts — ADD these lines after existing CRO export:
export { CioResultData, CioTools } from "./departments/cio";
```

**Step 6: Run tests to verify they pass**

Run: `pnpm test src/__tests__/contracts/cio.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add src/contracts/departments/cio.ts src/contracts/index.ts src/__tests__/contracts/cio.test.ts
git commit -m "feat(cio): add CIO department contract with Zod schemas"
```

---

### Task 2: CIO Tools Implementation

**Files:**
- Create: `src/lib/agents/cio/tools.ts`
- Test: `src/__tests__/agents/cio/tools.test.ts`

**Step 1: Write the tool implementations**

```ts
// src/lib/agents/cio/tools.ts
import { db } from "@/db";
import { companies, companyEmbeddings } from "@/db/schema";
import { eq } from "drizzle-orm";

const randomHex = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export async function searchCompany(params: {
  query: string;
  maxResults?: number;
}): Promise<{ results: Array<{ title: string; url: string; content: string }> }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not set");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: params.query,
      max_results: params.maxResults ?? 5,
      search_depth: "advanced",
      include_answer: true,
    }),
  });

  if (!res.ok) throw new Error(`Tavily API error: ${res.status}`);
  const data = await res.json();
  return {
    results: (data.results ?? []).map((r: { title: string; url: string; content: string }) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    })),
  };
}

export async function scrapeUrl(params: {
  url: string;
  extractFields?: string[];
}): Promise<{ content: string; metadata: Record<string, unknown> }> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not set");

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url: params.url,
      formats: ["markdown"],
    }),
  });

  if (!res.ok) throw new Error(`Firecrawl API error: ${res.status}`);
  const data = await res.json();
  return {
    content: data.data?.markdown ?? "",
    metadata: data.data?.metadata ?? {},
  };
}

export async function lookupSecFilings(params: {
  companyName: string;
  cik?: string;
  filingType?: string;
  limit?: number;
}): Promise<{ filings: Array<{ type: string; date: string; url: string; description: string }> }> {
  // SEC EDGAR EFTS full-text search API (no key needed)
  const query = params.cik ?? params.companyName;
  const res = await fetch(
    `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&dateRange=custom&startdt=2024-01-01&forms=${params.filingType ?? "10-K"}&hits.hits.total.value=${params.limit ?? 3}`,
    { headers: { "User-Agent": "ICC armaan@example.com", Accept: "application/json" } }
  );

  if (!res.ok) {
    // Fallback: try company search endpoint
    const searchRes = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&forms=${params.filingType ?? "10-K"}`,
      { headers: { "User-Agent": "ICC armaan@example.com", Accept: "application/json" } }
    );
    if (!searchRes.ok) return { filings: [] };
    const searchData = await searchRes.json();
    return {
      filings: (searchData.hits?.hits ?? []).slice(0, params.limit ?? 3).map((h: { _source: { file_type: string; file_date: string; file_description: string }; _id: string }) => ({
        type: h._source?.file_type ?? params.filingType ?? "10-K",
        date: h._source?.file_date ?? "",
        url: `https://www.sec.gov/Archives/edgar/data/${h._id}`,
        description: h._source?.file_description ?? "",
      })),
    };
  }

  const data = await res.json();
  return {
    filings: (data.hits?.hits ?? []).slice(0, params.limit ?? 3).map((h: { _source: { file_type: string; file_date: string; file_description: string }; _id: string }) => ({
      type: h._source?.file_type ?? params.filingType ?? "10-K",
      date: h._source?.file_date ?? "",
      url: `https://www.sec.gov/Archives/edgar/data/${h._id}`,
      description: h._source?.file_description ?? "",
    })),
  };
}

export async function getEconomicData(params: {
  seriesId: string;
  observationStart?: string;
  limit?: number;
}): Promise<{ observations: Array<{ date: string; value: string }> }> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error("FRED_API_KEY not set");

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", params.seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", String(params.limit ?? 10));
  if (params.observationStart) {
    url.searchParams.set("observation_start", params.observationStart);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FRED API error: ${res.status}`);
  const data = await res.json();
  return {
    observations: (data.observations ?? []).map((o: { date: string; value: string }) => ({
      date: o.date,
      value: o.value,
    })),
  };
}

export async function upsertCompany(params: {
  name: string;
  domain?: string;
  industry?: string;
  sector?: string;
  size?: "startup" | "mid" | "large" | "enterprise";
  headquarters?: string;
  description?: string;
  cultureSummary?: string;
  recentNews?: string;
  financialsSummary?: string;
  keyPeople?: Array<{ name: string; title: string; linkedinUrl?: string }>;
  internshipIntel?: string;
  careersUrl?: string;
  linkedinUrl?: string;
  glassdoorUrl?: string;
}): Promise<{ companyId: string; created: boolean }> {
  // Check if company exists by name or domain
  const existing = params.domain
    ? await db.select().from(companies).where(eq(companies.domain, params.domain)).limit(1)
    : await db.select().from(companies).where(eq(companies.name, params.name)).limit(1);

  const now = new Date().toISOString();

  if (existing.length > 0) {
    const id = existing[0]!.id;
    await db.update(companies).set({
      ...params,
      keyPeople: params.keyPeople ? JSON.stringify(params.keyPeople) : undefined,
      researchFreshness: now,
      updatedAt: now,
    }).where(eq(companies.id, id));
    return { companyId: id, created: false };
  }

  const id = randomHex();
  await db.insert(companies).values({
    id,
    ...params,
    keyPeople: params.keyPeople ? JSON.stringify(params.keyPeople) : null,
    researchFreshness: now,
    createdAt: now,
    updatedAt: now,
  });
  return { companyId: id, created: true };
}
```

**Step 2: Write failing tool tests**

```ts
// src/__tests__/agents/cio/tools.test.ts
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

// Mock fetch for external APIs
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("CIO Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("TAVILY_API_KEY", "test-tavily-key");
    vi.stubEnv("FIRECRAWL_API_KEY", "test-firecrawl-key");
    vi.stubEnv("FRED_API_KEY", "test-fred-key");
  });

  it("searchCompany calls Tavily API and returns results", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        results: [{ title: "Stripe", url: "https://stripe.com", content: "Payments company" }],
      }),
    });

    const { searchCompany } = await import("@/lib/agents/cio/tools");
    const result = await searchCompany({ query: "Stripe internship" });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.title).toBe("Stripe");
    expect(mockFetch).toHaveBeenCalledWith("https://api.tavily.com/search", expect.objectContaining({ method: "POST" }));
  });

  it("searchCompany throws when API key missing", async () => {
    vi.stubEnv("TAVILY_API_KEY", "");
    // Need fresh import to pick up new env
    vi.resetModules();
    const { searchCompany } = await import("@/lib/agents/cio/tools");
    await expect(searchCompany({ query: "test" })).rejects.toThrow("TAVILY_API_KEY not set");
  });

  it("getEconomicData calls FRED API with correct params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        observations: [{ date: "2026-03-01", value: "3.5" }],
      }),
    });

    const { getEconomicData } = await import("@/lib/agents/cio/tools");
    const result = await getEconomicData({ seriesId: "UNRATE" });
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]!.value).toBe("3.5");
  });

  it("upsertCompany creates new company when not found", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });

    const { upsertCompany } = await import("@/lib/agents/cio/tools");
    const result = await upsertCompany({ name: "Stripe", domain: "stripe.com" });
    expect(result.created).toBe(true);
    expect(result.companyId).toBeDefined();
  });

  it("upsertCompany updates existing company", async () => {
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
    const result = await upsertCompany({ name: "Stripe", domain: "stripe.com" });
    expect(result.created).toBe(false);
    expect(result.companyId).toBe("existing-id");
  });
});
```

**Step 3: Run tests to verify they fail, then create the file**

Run: `pnpm test src/__tests__/agents/cio/tools.test.ts`

**Step 4: Run tests to verify pass**

**Step 5: Commit**

```bash
git add src/lib/agents/cio/tools.ts src/__tests__/agents/cio/tools.test.ts
git commit -m "feat(cio): implement CIO research tools (Tavily, Firecrawl, SEC EDGAR, FRED)"
```

---

### Task 3: CIO Agent (Inngest Function)

**Files:**
- Create: `src/lib/agents/cio/index.ts`
- Test: `src/__tests__/agents/cio/agent.test.ts`

**Step 1: Write the CIO agent**

Follow the exact pattern from `src/lib/agents/cro/index.ts`:

```ts
// src/lib/agents/cio/index.ts
import { inngest } from "@/lib/inngest/client";
import { generateText, zodSchema, stepCountIs } from "ai";
import type { ToolSet } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";
import { agentLogger } from "@/lib/agents/logger";
import { eventBus } from "@/lib/agents/event-bus";
import {
  searchCompany,
  scrapeUrl,
  lookupSecFilings,
  getEconomicData,
  upsertCompany,
} from "./tools";

const CIO_DEFINITION = {
  department: "cio" as const,
  name: "Chief Information Officer",
  codename: "Library",
  model: "claude-sonnet-4-20250514",
  maxOutputTokens: 4096,
  temperature: 0.3,
};

const cioTools = {
  searchCompany: {
    description: "Search for company information using Tavily",
    inputSchema: zodSchema(
      z.object({
        query: z.string(),
        maxResults: z.number().default(5),
      })
    ),
    execute: async (params: { query: string; maxResults?: number }) =>
      searchCompany(params),
  },
  scrapeUrl: {
    description: "Scrape a specific URL for company data using Firecrawl",
    inputSchema: zodSchema(
      z.object({
        url: z.string(),
        extractFields: z.array(z.string()).optional(),
      })
    ),
    execute: async (params: { url: string; extractFields?: string[] }) =>
      scrapeUrl(params),
  },
  lookupSecFilings: {
    description: "Look up SEC EDGAR filings for a public company",
    inputSchema: zodSchema(
      z.object({
        companyName: z.string(),
        cik: z.string().optional(),
        filingType: z.enum(["10-K", "10-Q", "8-K", "DEF 14A"]).default("10-K"),
        limit: z.number().default(3),
      })
    ),
    execute: async (params: {
      companyName: string;
      cik?: string;
      filingType?: string;
      limit?: number;
    }) => lookupSecFilings(params),
  },
  getEconomicData: {
    description: "Get economic indicators from FRED API",
    inputSchema: zodSchema(
      z.object({
        seriesId: z.string(),
        observationStart: z.string().optional(),
        limit: z.number().default(10),
      })
    ),
    execute: async (params: {
      seriesId: string;
      observationStart?: string;
      limit?: number;
    }) => getEconomicData(params),
  },
  upsertCompany: {
    description: "Create or update a company record in the database",
    inputSchema: zodSchema(
      z.object({
        name: z.string(),
        domain: z.string().optional(),
        industry: z.string().optional(),
        sector: z.string().optional(),
        size: z.enum(["startup", "mid", "large", "enterprise"]).optional(),
        headquarters: z.string().optional(),
        description: z.string().optional(),
        cultureSummary: z.string().optional(),
        recentNews: z.string().optional(),
        financialsSummary: z.string().optional(),
        keyPeople: z.array(z.object({
          name: z.string(),
          title: z.string(),
          linkedinUrl: z.string().optional(),
        })).optional(),
        internshipIntel: z.string().optional(),
        careersUrl: z.string().optional(),
        linkedinUrl: z.string().optional(),
        glassdoorUrl: z.string().optional(),
      })
    ),
    execute: async (params: Parameters<typeof upsertCompany>[0]) =>
      upsertCompany(params),
  },
} satisfies ToolSet;

export const cioAgent = inngest.createFunction(
  { id: "cio-agent", retries: 3 },
  { event: "ceo/dispatch" },
  async ({ event, step }) => {
    if (event.data.department !== "cio") return;

    const { executionId, taskId, instructions } = event.data;
    const startTime = Date.now();

    const logId = await step.run("log-start", async () => {
      return agentLogger.start({
        agent: "cio",
        action: "company-research",
        inputSummary: instructions.slice(0, 200),
      });
    });

    await step.run("publish-start", async () => {
      eventBus.publish(executionId, {
        type: "agent_start",
        department: "cio",
        taskId,
        timestamp: new Date().toISOString(),
      });
    });

    try {
      const result = await step.run("cio-generate", async () => {
        eventBus.publish(executionId, {
          type: "agent_progress",
          department: "cio",
          step: "Researching company...",
          progress: 30,
          timestamp: new Date().toISOString(),
        });

        return generateText({
          model: anthropic(CIO_DEFINITION.model),
          maxOutputTokens: CIO_DEFINITION.maxOutputTokens,
          temperature: CIO_DEFINITION.temperature,
          system: `You are the Chief Information Officer (CIO) of an internship command center.
Your job is to research companies thoroughly: find their culture, recent news, financials, key people, and internship programs.
Use searchCompany for web research, scrapeUrl for specific pages, lookupSecFilings for public companies, getEconomicData for market context.
Always upsertCompany to save findings to the database.
Be thorough but concise. Focus on information relevant to an internship applicant.`,
          prompt: instructions,
          tools: cioTools,
          stopWhen: stepCountIs(8),
        });
      });

      const durationMs = Date.now() - startTime;
      const tokenUsage = {
        input: result.usage?.inputTokens ?? 0,
        output: result.usage?.outputTokens ?? 0,
      };

      await step.run("log-complete", async () => {
        await agentLogger.complete(logId, {
          outputSummary: result.text.slice(0, 500),
          tokensUsed: tokenUsage.input + tokenUsage.output,
          durationMs,
        });
      });

      await step.run("publish-complete", async () => {
        eventBus.publish(executionId, {
          type: "agent_complete",
          department: "cio",
          summary: result.text.slice(0, 300),
          timestamp: new Date().toISOString(),
        });
      });

      await step.run("send-complete-event", async () => {
        await inngest.send({
          name: "agent/complete",
          data: {
            executionId,
            department: "cio",
            taskId,
            result: {
              summary: result.text,
              toolCalls: result.toolCalls?.length ?? 0,
            },
            tokenUsage,
            durationMs,
            timestamp: new Date().toISOString(),
          },
        });
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      await step.run("log-fail", async () => {
        await agentLogger.fail(logId, { error: errorMsg, durationMs });
      });

      await step.run("publish-error", async () => {
        eventBus.publish(executionId, {
          type: "agent_error",
          department: "cio",
          error: errorMsg,
          retryable: true,
          timestamp: new Date().toISOString(),
        });
      });

      await step.run("send-error-event", async () => {
        await inngest.send({
          name: "agent/error",
          data: {
            executionId,
            department: "cio",
            taskId,
            error: errorMsg,
            retryable: true,
            attempt: 1,
            timestamp: new Date().toISOString(),
          },
        });
      });

      throw error;
    }
  }
);
```

**Step 2: Write agent test (same pattern as CRO agent test)**

```ts
// src/__tests__/agents/cio/agent.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: "Research complete for Stripe. Key findings...",
    toolCalls: [],
    usage: { inputTokens: 800, outputTokens: 400 },
  }),
  tool: vi.fn((opts) => opts),
  zodSchema: vi.fn((schema) => schema),
  stepCountIs: vi.fn((n) => ({ type: "step-count", count: n })),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn().mockReturnValue("mock-model"),
}));

vi.mock("@/lib/agents/logger", () => ({
  agentLogger: {
    start: vi.fn().mockResolvedValue("log-1"),
    complete: vi.fn().mockResolvedValue(undefined),
    fail: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/agents/event-bus", () => ({
  eventBus: { publish: vi.fn() },
}));

vi.mock("@/lib/agents/cio/tools", () => ({
  searchCompany: vi.fn().mockResolvedValue({ results: [] }),
  scrapeUrl: vi.fn().mockResolvedValue({ content: "", metadata: {} }),
  lookupSecFilings: vi.fn().mockResolvedValue({ filings: [] }),
  getEconomicData: vi.fn().mockResolvedValue({ observations: [] }),
  upsertCompany: vi.fn().mockResolvedValue({ companyId: "c1", created: true }),
}));

describe("CIO Agent", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("exports a cioAgent function", async () => {
    const mod = await import("@/lib/agents/cio");
    expect(mod.cioAgent).toBeDefined();
  });
});
```

**Step 3: Run tests**

Run: `pnpm test src/__tests__/agents/cio/agent.test.ts`
Expected: PASS

**Step 4: Register in Inngest route**

Modify `src/app/api/inngest/route.ts`:

```ts
import { cioAgent } from "@/lib/agents/cio";
// Add to functions array:
functions: [ceoOrchestrator, croAgent, cioAgent, compileBriefing],
```

**Step 5: Commit**

```bash
git add src/lib/agents/cio/index.ts src/__tests__/agents/cio/agent.test.ts src/app/api/inngest/route.ts
git commit -m "feat(cio): implement CIO agent with Inngest function registration"
```

---

### Task 4: Update .env.example with new keys

**Files:**
- Modify: `src/../.env.example`

**Step 1: Add new env vars**

Append to `.env.example` after existing optional section:

```
# Firecrawl (company page scraping)
FIRECRAWL_API_KEY=

# FRED (economic data)
FRED_API_KEY=

# JSearch (job discovery via RapidAPI)
JSEARCH_API_KEY=

# Resend (email sending)
RESEND_API_KEY=
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add Phase 2 API keys to .env.example"
```

---

### Task 5: Milestone 1 Verification

Run: `pnpm test && pnpm build`
Expected: All tests pass, build succeeds.

---

## Milestone 2: COO Agent — "The Mail Room"

### Task 6: COO Contract

**Files:**
- Create: `src/contracts/departments/coo.ts`
- Modify: `src/contracts/index.ts`
- Test: `src/__tests__/contracts/coo.test.ts`

**Step 1: Write contract**

```ts
// src/contracts/departments/coo.ts
import { z } from "zod/v4";

export const EmailClassification = z.enum([
  "interview_invite",
  "rejection",
  "info_request",
  "follow_up_needed",
  "offer",
  "newsletter",
  "other",
]);

export const CooResultData = z.object({
  emailsSynced: z.number(),
  emailsClassified: z.array(z.object({
    gmailId: z.string(),
    threadId: z.string(),
    subject: z.string(),
    from: z.string(),
    classification: EmailClassification,
    urgency: z.enum(["high", "medium", "low"]),
    suggestedAction: z.string().optional(),
    linkedApplicationId: z.string().optional(),
  })).default([]),
  calendarEventsCreated: z.array(z.object({
    googleEventId: z.string(),
    title: z.string(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    interviewId: z.string().optional(),
  })).default([]),
  statusUpdates: z.array(z.object({
    applicationId: z.string(),
    oldStatus: z.string(),
    newStatus: z.string(),
    reason: z.string(),
  })).default([]),
});

export const CooTools = {
  fetchRecentEmails: z.object({
    description: z.literal("Fetch recent emails from Gmail API"),
    parameters: z.object({
      maxResults: z.number().default(20),
      query: z.string().optional(),
      after: z.string().optional(),
    }),
  }),
  classifyEmail: z.object({
    description: z.literal("Classify an email and suggest actions"),
    parameters: z.object({
      gmailId: z.string(),
      threadId: z.string(),
      subject: z.string(),
      from: z.string(),
      snippet: z.string(),
      bodyText: z.string(),
    }),
  }),
  createCalendarEvent: z.object({
    description: z.literal("Create a Google Calendar event for an interview"),
    parameters: z.object({
      title: z.string(),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      description: z.string().optional(),
      location: z.string().optional(),
      interviewId: z.string().optional(),
    }),
  }),
  updateApplicationFromEmail: z.object({
    description: z.literal("Update application status based on email content"),
    parameters: z.object({
      applicationId: z.string(),
      newStatus: z.string(),
      reason: z.string(),
      emailGmailId: z.string(),
    }),
  }),
} as const;
```

**Step 2: Write tests (same pattern as CIO contract test)**

```ts
// src/__tests__/contracts/coo.test.ts
import { describe, it, expect } from "vitest";
import { CooResultData, CooTools, EmailClassification } from "@/contracts/departments/coo";

describe("EmailClassification", () => {
  it("accepts valid classification values", () => {
    for (const c of ["interview_invite", "rejection", "offer", "newsletter"]) {
      expect(EmailClassification.parse(c)).toBe(c);
    }
  });

  it("rejects invalid classification", () => {
    expect(() => EmailClassification.parse("spam")).toThrow();
  });
});

describe("CooResultData", () => {
  it("parses valid COO result", () => {
    const result = CooResultData.parse({
      emailsSynced: 15,
      emailsClassified: [{
        gmailId: "gm-1",
        threadId: "th-1",
        subject: "Interview Invite",
        from: "recruiter@company.com",
        classification: "interview_invite",
        urgency: "high",
        suggestedAction: "Schedule interview",
      }],
    });
    expect(result.emailsSynced).toBe(15);
    expect(result.emailsClassified).toHaveLength(1);
  });

  it("applies defaults for optional arrays", () => {
    const result = CooResultData.parse({ emailsSynced: 0 });
    expect(result.emailsClassified).toEqual([]);
    expect(result.calendarEventsCreated).toEqual([]);
    expect(result.statusUpdates).toEqual([]);
  });
});

describe("CooTools", () => {
  it("fetchRecentEmails defaults maxResults to 20", () => {
    const parsed = CooTools.fetchRecentEmails.shape.parameters.parse({});
    expect(parsed.maxResults).toBe(20);
  });

  it("classifyEmail requires all fields", () => {
    expect(() => CooTools.classifyEmail.shape.parameters.parse({
      gmailId: "gm-1",
    })).toThrow();
  });
});
```

**Step 3: Create files, add to barrel, run tests, commit**

Add to `src/contracts/index.ts`:
```ts
export { CooResultData, CooTools, EmailClassification } from "./departments/coo";
```

```bash
git add src/contracts/departments/coo.ts src/contracts/index.ts src/__tests__/contracts/coo.test.ts
git commit -m "feat(coo): add COO department contract with email classification schemas"
```

---

### Task 7: COO Tools Implementation

**Files:**
- Create: `src/lib/agents/coo/tools.ts`
- Test: `src/__tests__/agents/coo/tools.test.ts`

**Step 1: Write COO tools**

**Design decision reminder:** NO email body storage in DB — fetch live from Gmail API. Only store classification metadata in the `emails` table. Calendar is one-way create only.

```ts
// src/lib/agents/coo/tools.ts
import { db } from "@/db";
import { emails, applications, calendarEvents, interviews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { google } from "googleapis";
import { auth } from "@/lib/auth";

const randomHex = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

async function getGmailClient() {
  const session = await auth();
  if (!session?.accessToken) throw new Error("No Gmail access token — user must be signed in with Google OAuth");
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

async function getCalendarClient() {
  const session = await auth();
  if (!session?.accessToken) throw new Error("No Calendar access token");
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function fetchRecentEmails(params: {
  maxResults?: number;
  query?: string;
  after?: string;
}): Promise<{
  emails: Array<{
    gmailId: string;
    threadId: string;
    subject: string;
    from: string;
    snippet: string;
    bodyText: string;
    receivedAt: string;
  }>;
}> {
  const gmail = await getGmailClient();
  let q = params.query ?? "";
  if (params.after) q += ` after:${params.after}`;

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: params.maxResults ?? 20,
    q: q || undefined,
  });

  const messages = list.data.messages ?? [];
  const results = [];

  for (const msg of messages.slice(0, params.maxResults ?? 20)) {
    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "full",
    });

    const headers = full.data.payload?.headers ?? [];
    const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
    const from = headers.find((h) => h.name === "From")?.value ?? "";
    const date = headers.find((h) => h.name === "Date")?.value ?? "";

    // Extract body text
    let bodyText = "";
    const parts = full.data.payload?.parts ?? [];
    const textPart = parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      bodyText = Buffer.from(textPart.body.data, "base64").toString("utf-8");
    } else if (full.data.payload?.body?.data) {
      bodyText = Buffer.from(full.data.payload.body.data, "base64").toString("utf-8");
    }

    results.push({
      gmailId: msg.id!,
      threadId: msg.threadId!,
      subject,
      from,
      snippet: full.data.snippet ?? "",
      bodyText: bodyText.slice(0, 2000), // Truncate for LLM context
      receivedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
    });
  }

  return { emails: results };
}

export async function classifyEmail(params: {
  gmailId: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  bodyText: string;
}): Promise<{
  classification: string;
  urgency: string;
  suggestedAction: string;
  linkedApplicationId: string | null;
}> {
  // Store classification metadata (NOT body) in emails table
  const existing = await db.select().from(emails).where(eq(emails.gmailId, params.gmailId)).limit(1);

  // Return existing classification if already processed
  if (existing.length > 0 && existing[0]!.isProcessed) {
    return {
      classification: existing[0]!.classification ?? "other",
      urgency: existing[0]!.urgency ?? "low",
      suggestedAction: existing[0]!.suggestedAction ?? "",
      linkedApplicationId: existing[0]!.applicationId ?? null,
    };
  }

  // AI will call this tool after deciding classification — store the metadata
  // The actual classification is done by the LLM, this tool just persists it
  // For now, return a placeholder that the LLM will interpret
  const id = existing.length > 0 ? existing[0]!.id : randomHex();

  if (existing.length === 0) {
    await db.insert(emails).values({
      id,
      gmailId: params.gmailId,
      threadId: params.threadId,
      subject: params.subject,
      fromAddress: params.from,
      snippet: params.snippet,
      // bodyText NOT stored — fetch live from Gmail
      isProcessed: false,
      receivedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  return {
    classification: "pending",
    urgency: "medium",
    suggestedAction: "Awaiting AI classification",
    linkedApplicationId: null,
  };
}

export async function createCalendarEvent(params: {
  title: string;
  startAt: string;
  endAt: string;
  description?: string;
  location?: string;
  interviewId?: string;
}): Promise<{ googleEventId: string; htmlLink: string }> {
  const calendar = await getCalendarClient();

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: params.title,
      description: params.description,
      location: params.location,
      start: { dateTime: params.startAt },
      end: { dateTime: params.endAt },
    },
  });

  const googleEventId = event.data.id!;
  const now = new Date().toISOString();

  // Store in local DB for reference
  await db.insert(calendarEvents).values({
    id: randomHex(),
    googleEventId,
    title: params.title,
    description: params.description ?? null,
    startAt: params.startAt,
    endAt: params.endAt,
    location: params.location ?? null,
    interviewId: params.interviewId ?? null,
    source: "google",
    createdAt: now,
  });

  return {
    googleEventId,
    htmlLink: event.data.htmlLink ?? "",
  };
}

export async function updateApplicationFromEmail(params: {
  applicationId: string;
  newStatus: string;
  reason: string;
  emailGmailId: string;
}): Promise<{ success: boolean }> {
  const now = new Date().toISOString();

  // Update application status
  await db.update(applications).set({
    status: params.newStatus as "discovered" | "applied" | "screening" | "interview_scheduled" | "interviewing" | "under_review" | "offer" | "accepted" | "rejected" | "withdrawn",
    notes: `[COO ${now}] ${params.reason} (from email ${params.emailGmailId})`,
    updatedAt: now,
  }).where(eq(applications.id, params.applicationId));

  // Link email to application
  await db.update(emails).set({
    applicationId: params.applicationId,
    isProcessed: true,
  }).where(eq(emails.gmailId, params.emailGmailId));

  return { success: true };
}
```

**Step 2: Write tests**

```ts
// src/__tests__/agents/coo/tools.test.ts
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

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ accessToken: "mock-token" }),
}));

vi.mock("googleapis", () => ({
  google: {
    auth: { OAuth2: vi.fn().mockImplementation(() => ({ setCredentials: vi.fn() })) },
    gmail: vi.fn().mockReturnValue({
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({ data: { messages: [] } }),
          get: vi.fn().mockResolvedValue({ data: { payload: { headers: [] }, snippet: "" } }),
        },
      },
    }),
    calendar: vi.fn().mockReturnValue({
      events: {
        insert: vi.fn().mockResolvedValue({ data: { id: "gcal-1", htmlLink: "https://calendar.google.com/event/1" } }),
      },
    }),
  },
}));

describe("COO Tools", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("classifyEmail stores metadata and returns classification", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const { classifyEmail } = await import("@/lib/agents/coo/tools");
    const result = await classifyEmail({
      gmailId: "gm-1",
      threadId: "th-1",
      subject: "Interview Invite",
      from: "recruiter@company.com",
      snippet: "We'd like to invite you...",
      bodyText: "Full email body here",
    });
    expect(result).toHaveProperty("classification");
    expect(result).toHaveProperty("urgency");
  });

  it("updateApplicationFromEmail updates status", async () => {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const { updateApplicationFromEmail } = await import("@/lib/agents/coo/tools");
    const result = await updateApplicationFromEmail({
      applicationId: "app-1",
      newStatus: "interview_scheduled",
      reason: "Interview invite received",
      emailGmailId: "gm-1",
    });
    expect(result.success).toBe(true);
  });
});
```

**Step 3: Run tests, commit**

```bash
git add src/lib/agents/coo/tools.ts src/__tests__/agents/coo/tools.test.ts
git commit -m "feat(coo): implement COO tools (Gmail fetch, email classify, calendar create)"
```

---

### Task 8: COO Agent (Inngest Function)

**Files:**
- Create: `src/lib/agents/coo/index.ts`
- Test: `src/__tests__/agents/coo/agent.test.ts`
- Modify: `src/app/api/inngest/route.ts`

**Step 1: Write COO agent (same pattern as CIO agent, using COO tools)**

Same structure as CIO agent in Task 3. Key differences:
- `department: "coo"` filter
- System prompt about email classification + calendar management
- Uses `fetchRecentEmails`, `classifyEmail`, `createCalendarEvent`, `updateApplicationFromEmail` tools
- `stepCountIs(10)` (more steps needed for email processing)

```ts
// src/lib/agents/coo/index.ts
import { inngest } from "@/lib/inngest/client";
import { generateText, zodSchema, stepCountIs } from "ai";
import type { ToolSet } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";
import { agentLogger } from "@/lib/agents/logger";
import { eventBus } from "@/lib/agents/event-bus";
import {
  fetchRecentEmails,
  classifyEmail,
  createCalendarEvent,
  updateApplicationFromEmail,
} from "./tools";

const COO_DEFINITION = {
  department: "coo" as const,
  name: "Chief Operating Officer",
  codename: "Mail Room",
  model: "claude-sonnet-4-20250514",
  maxOutputTokens: 4096,
  temperature: 0.2,
};

const cooTools = {
  fetchRecentEmails: {
    description: "Fetch recent emails from Gmail API",
    inputSchema: zodSchema(
      z.object({
        maxResults: z.number().default(20),
        query: z.string().optional(),
        after: z.string().optional(),
      })
    ),
    execute: async (params: { maxResults?: number; query?: string; after?: string }) =>
      fetchRecentEmails(params),
  },
  classifyEmail: {
    description: "Classify an email and suggest actions",
    inputSchema: zodSchema(
      z.object({
        gmailId: z.string(),
        threadId: z.string(),
        subject: z.string(),
        from: z.string(),
        snippet: z.string(),
        bodyText: z.string(),
      })
    ),
    execute: async (params: {
      gmailId: string; threadId: string; subject: string;
      from: string; snippet: string; bodyText: string;
    }) => classifyEmail(params),
  },
  createCalendarEvent: {
    description: "Create a Google Calendar event for an interview",
    inputSchema: zodSchema(
      z.object({
        title: z.string(),
        startAt: z.string(),
        endAt: z.string(),
        description: z.string().optional(),
        location: z.string().optional(),
        interviewId: z.string().optional(),
      })
    ),
    execute: async (params: {
      title: string; startAt: string; endAt: string;
      description?: string; location?: string; interviewId?: string;
    }) => createCalendarEvent(params),
  },
  updateApplicationFromEmail: {
    description: "Update application status based on email content",
    inputSchema: zodSchema(
      z.object({
        applicationId: z.string(),
        newStatus: z.string(),
        reason: z.string(),
        emailGmailId: z.string(),
      })
    ),
    execute: async (params: {
      applicationId: string; newStatus: string;
      reason: string; emailGmailId: string;
    }) => updateApplicationFromEmail(params),
  },
} satisfies ToolSet;

export const cooAgent = inngest.createFunction(
  { id: "coo-agent", retries: 3 },
  { event: "ceo/dispatch" },
  async ({ event, step }) => {
    if (event.data.department !== "coo") return;

    const { executionId, taskId, instructions } = event.data;
    const startTime = Date.now();

    const logId = await step.run("log-start", async () => {
      return agentLogger.start({
        agent: "coo",
        action: "email-calendar-sync",
        inputSummary: instructions.slice(0, 200),
      });
    });

    await step.run("publish-start", async () => {
      eventBus.publish(executionId, {
        type: "agent_start",
        department: "coo",
        taskId,
        timestamp: new Date().toISOString(),
      });
    });

    try {
      const result = await step.run("coo-generate", async () => {
        eventBus.publish(executionId, {
          type: "agent_progress",
          department: "coo",
          step: "Processing emails...",
          progress: 20,
          timestamp: new Date().toISOString(),
        });

        return generateText({
          model: anthropic(COO_DEFINITION.model),
          maxOutputTokens: COO_DEFINITION.maxOutputTokens,
          temperature: COO_DEFINITION.temperature,
          system: `You are the Chief Operating Officer (COO) of an internship command center.
Your job is to process incoming emails, classify them by relevance to internship applications, and manage the calendar.
1. Fetch recent emails using fetchRecentEmails
2. For each relevant email (from recruiters, companies, etc.), classify it using classifyEmail
3. If an email contains an interview invite, create a calendar event using createCalendarEvent
4. If an email indicates a status change (rejection, offer, etc.), update the application using updateApplicationFromEmail
Skip newsletters and irrelevant emails. Focus on actionable items.`,
          prompt: instructions,
          tools: cooTools,
          stopWhen: stepCountIs(10),
        });
      });

      const durationMs = Date.now() - startTime;
      const tokenUsage = {
        input: result.usage?.inputTokens ?? 0,
        output: result.usage?.outputTokens ?? 0,
      };

      await step.run("log-complete", async () => {
        await agentLogger.complete(logId, {
          outputSummary: result.text.slice(0, 500),
          tokensUsed: tokenUsage.input + tokenUsage.output,
          durationMs,
        });
      });

      await step.run("publish-complete", async () => {
        eventBus.publish(executionId, {
          type: "agent_complete",
          department: "coo",
          summary: result.text.slice(0, 300),
          timestamp: new Date().toISOString(),
        });
      });

      await step.run("send-complete-event", async () => {
        await inngest.send({
          name: "agent/complete",
          data: {
            executionId,
            department: "coo",
            taskId,
            result: { summary: result.text, toolCalls: result.toolCalls?.length ?? 0 },
            tokenUsage,
            durationMs,
            timestamp: new Date().toISOString(),
          },
        });
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      await step.run("log-fail", async () => {
        await agentLogger.fail(logId, { error: errorMsg, durationMs });
      });

      await step.run("publish-error", async () => {
        eventBus.publish(executionId, {
          type: "agent_error",
          department: "coo",
          error: errorMsg,
          retryable: true,
          timestamp: new Date().toISOString(),
        });
      });

      await step.run("send-error-event", async () => {
        await inngest.send({
          name: "agent/error",
          data: {
            executionId, department: "coo", taskId,
            error: errorMsg, retryable: true, attempt: 1,
            timestamp: new Date().toISOString(),
          },
        });
      });

      throw error;
    }
  }
);
```

**Step 2: Write agent test, register in Inngest route**

```ts
// src/__tests__/agents/coo/agent.test.ts — same mock pattern as CIO agent test
```

Update `src/app/api/inngest/route.ts`:
```ts
import { cooAgent } from "@/lib/agents/coo";
functions: [ceoOrchestrator, croAgent, cioAgent, cooAgent, compileBriefing],
```

**Step 3: Commit**

```bash
git add src/lib/agents/coo/ src/__tests__/agents/coo/ src/app/api/inngest/route.ts
git commit -m "feat(coo): implement COO agent with Gmail/Calendar tools"
```

---

### Task 9: Auth.js Session Extension for Access Token

**Files:**
- Check: `src/lib/auth.ts` (or wherever auth config lives)

The COO tools need `session.accessToken` for Gmail/Calendar APIs. Verify Auth.js is configured to pass the Google OAuth access token through to the session. If not, add the `callbacks.jwt` and `callbacks.session` to forward it.

This is a **check step** — only modify if the access token isn't already available. The existing Google OAuth setup may already handle this.

**Step 1: Read auth config and verify**

**Step 2: If needed, add token forwarding in auth callbacks**

**Step 3: Commit if changes made**

---

### Task 10: Milestone 2 Verification

Run: `pnpm test && pnpm build`

---

## Milestone 3: CRO Enhancement

### Task 11: CRO Tools Enhancement — JSearch API

**Files:**
- Modify: `src/lib/agents/cro/tools.ts` (add new functions)
- Modify: `src/contracts/departments/cro.ts` (add new tool schemas)
- Modify: `src/lib/agents/cro/index.ts` (register new tools)
- Test: `src/__tests__/agents/cro/tools.test.ts` (add new test cases)

**Step 1: Add JSearch tool schema to contract**

```ts
// Add to src/contracts/departments/cro.ts CroTools:
searchJobs: z.object({
  description: z.literal("Search for internship job listings using JSearch API"),
  parameters: z.object({
    query: z.string(),
    location: z.string().optional(),
    datePosted: z.enum(["today", "3days", "week", "month"]).default("week"),
    remoteOnly: z.boolean().default(false),
    limit: z.number().default(10),
  }),
}),
lookupAtsJob: z.object({
  description: z.literal("Look up a specific job on Lever or Greenhouse ATS"),
  parameters: z.object({
    company: z.string(),
    atsType: z.enum(["lever", "greenhouse"]),
    jobId: z.string().optional(),
  }),
}),
```

**Step 2: Implement the tool functions**

```ts
// Add to src/lib/agents/cro/tools.ts:

export async function searchJobs(params: {
  query: string;
  location?: string;
  datePosted?: string;
  remoteOnly?: boolean;
  limit?: number;
}): Promise<{
  jobs: Array<{
    title: string;
    company: string;
    location: string;
    url: string;
    datePosted: string;
    description: string;
  }>;
}> {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) throw new Error("JSEARCH_API_KEY not set");

  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query", params.query);
  if (params.location) url.searchParams.set("location", params.location);
  url.searchParams.set("date_posted", params.datePosted ?? "week");
  if (params.remoteOnly) url.searchParams.set("remote_jobs_only", "true");
  url.searchParams.set("num_pages", "1");

  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  });

  if (!res.ok) throw new Error(`JSearch API error: ${res.status}`);
  const data = await res.json();

  return {
    jobs: (data.data ?? []).slice(0, params.limit ?? 10).map((j: {
      job_title: string; employer_name: string; job_city: string;
      job_state: string; job_apply_link: string; job_posted_at_datetime_utc: string;
      job_description: string;
    }) => ({
      title: j.job_title,
      company: j.employer_name,
      location: `${j.job_city ?? ""}, ${j.job_state ?? ""}`.trim(),
      url: j.job_apply_link ?? "",
      datePosted: j.job_posted_at_datetime_utc ?? "",
      description: (j.job_description ?? "").slice(0, 500),
    })),
  };
}

export async function lookupAtsJob(params: {
  company: string;
  atsType: "lever" | "greenhouse";
  jobId?: string;
}): Promise<{
  jobs: Array<{
    id: string;
    title: string;
    location: string;
    url: string;
    team: string;
  }>;
}> {
  const slug = params.company.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");

  if (params.atsType === "lever") {
    const url = params.jobId
      ? `https://api.lever.co/v0/postings/${slug}/${params.jobId}`
      : `https://api.lever.co/v0/postings/${slug}?mode=json`;
    const res = await fetch(url);
    if (!res.ok) return { jobs: [] };
    const data = await res.json();
    const items = Array.isArray(data) ? data : [data];
    return {
      jobs: items.slice(0, 20).map((j: { id: string; text: string; categories: { location: string; team: string }; hostedUrl: string }) => ({
        id: j.id,
        title: j.text,
        location: j.categories?.location ?? "",
        url: j.hostedUrl ?? "",
        team: j.categories?.team ?? "",
      })),
    };
  }

  // Greenhouse
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  const res = await fetch(url);
  if (!res.ok) return { jobs: [] };
  const data = await res.json();
  return {
    jobs: (data.jobs ?? []).slice(0, 20).map((j: { id: number; title: string; location: { name: string }; absolute_url: string; departments: Array<{ name: string }> }) => ({
      id: String(j.id),
      title: j.title,
      location: j.location?.name ?? "",
      url: j.absolute_url ?? "",
      team: j.departments?.[0]?.name ?? "",
    })),
  };
}
```

**Step 3: Add tools to CRO agent index, update contract barrel**

**Step 4: Write tests for new tools, run all tests, commit**

```bash
git add src/contracts/departments/cro.ts src/lib/agents/cro/tools.ts src/lib/agents/cro/index.ts src/__tests__/agents/cro/tools.test.ts
git commit -m "feat(cro): add JSearch job discovery and Lever/Greenhouse ATS lookup"
```

---

### Task 12: CRO Contract Test Update

Update `src/__tests__/contracts/cro.test.ts` (create if it doesn't exist) to cover the new tool schemas.

---

### Task 13: Milestone 3 Verification

Run: `pnpm test && pnpm build`

---

## Milestone 4: Research Page (/research)

### Task 14: Research Page — Company List Panel (Left 30%)

**Files:**
- Create: `src/components/research/company-list.tsx`
- Create: `src/lib/research-queries.ts` (server-side data fetching)
- Modify: `src/app/research/page.tsx`

**Step 1: Create server-side data fetching**

```ts
// src/lib/research-queries.ts
import { db } from "@/db";
import { companies } from "@/db/schema";
import { desc, like, or } from "drizzle-orm";

export async function getCompanies(search?: string) {
  const conditions = search
    ? or(
        like(companies.name, `%${search}%`),
        like(companies.domain, `%${search}%`),
        like(companies.industry, `%${search}%`)
      )
    : undefined;

  return db.select().from(companies).where(conditions).orderBy(desc(companies.updatedAt)).limit(50);
}

export async function getCompanyById(id: string) {
  const rows = await db.select().from(companies).where(
    // eq import needed
    require("drizzle-orm").eq(companies.id, id)
  ).limit(1);
  return rows[0] ?? null;
}
```

**Step 2: Create company list component (client component)**

Boardroom design system: dark glass cards, gold accents, tier badges.
Searchable list with `<input>` at top. Each item shows company name, industry, tier badge, research freshness indicator.

**Step 3: Create research page layout**

Server component. Left panel (30%) = company list. Right panel (70%) = company profile or empty state.

**Step 4: Commit**

```bash
git add src/components/research/ src/lib/research-queries.ts src/app/research/
git commit -m "feat(research): build research page with company list panel"
```

---

### Task 15: Research Page — Company Profile Panel (Right 70%)

**Files:**
- Create: `src/components/research/company-profile.tsx`
- Create: `src/components/research/deep-dive-button.tsx`
- Create: `src/app/research/[companyId]/page.tsx` (or use search params)

**Step 1: Company profile component**

Displays: name, domain, industry, size, headquarters, description, culture summary, recent news, financials, key people, internship intel, careers URL, LinkedIn, Glassdoor.
Uses Boardroom design: glass cards, sections with gold dividers, data in JetBrains Mono.

**Step 2: "Request Deep Dive" button**

Client component that calls `POST /api/agents/bell` with prompt: `"Research company: {companyName}"`. This dispatches the CEO, which will route to CIO.

**Step 3: Commit**

```bash
git add src/components/research/ src/app/research/
git commit -m "feat(research): add company profile panel and deep dive button"
```

---

### Task 16: Milestone 4 Verification

Run: `pnpm test && pnpm build`

---

## Milestone 5: Communications Page (/communications)

### Task 17: Communications Page — Email List Panel (Left)

**Files:**
- Create: `src/components/communications/email-list.tsx`
- Create: `src/lib/communications-queries.ts`
- Modify: `src/app/communications/page.tsx`

**Step 1: Create server queries for classified emails**

Fetch from `emails` table — returns classification metadata. The actual email body is fetched live from Gmail when user clicks to view.

**Step 2: Build email list component**

Two-panel layout. Left: classified email list with classification badges (color-coded by urgency), sender, subject, time. Sortable/filterable by classification.

**Step 3: Commit**

```bash
git add src/components/communications/ src/lib/communications-queries.ts src/app/communications/
git commit -m "feat(communications): build email list panel with classification badges"
```

---

### Task 18: Communications Page — Thread View + Outreach Queue

**Files:**
- Create: `src/components/communications/email-thread.tsx`
- Create: `src/components/communications/outreach-queue.tsx`

**Step 1: Email thread view (right panel)**

Shows selected email thread. Fetches body live from Gmail API via a server action. Shows classification, urgency, suggested action, linked application.

**Step 2: Outreach queue section**

Shows pending drafts from `outreachQueue` table. Each item has approve/reject buttons (calls existing `/api/outreach/[id]/approve` and `/api/outreach/[id]/reject` routes).

**Step 3: Commit**

```bash
git add src/components/communications/
git commit -m "feat(communications): add thread view and outreach queue panel"
```

---

### Task 19: Milestone 5 Verification

Run: `pnpm test && pnpm build`

---

## Milestone 6: CEO Integration + Final

### Task 20: Update CEO Orchestrator for Multi-Department Dispatch

**Files:**
- Modify: `src/lib/agents/ceo/index.ts`

**Step 1: Update CEO to dispatch CIO + COO alongside CRO**

The CEO currently only dispatches CRO. Update the `ceo-decide` step to dispatch all three departments in parallel. Use `waitForEvent` for each.

Key changes:
- Decision logic: always dispatch CRO. Also dispatch CIO if prompt mentions research/company. Also dispatch COO if prompt mentions email/calendar or if trigger is "scheduled" (daily briefing).
- For scheduled briefings: dispatch all three (CRO + COO + CIO for stale research).
- Wait for all dispatched agents using parallel `waitForEvent` calls.
- Compile briefing with all department results.

**Step 2: Update compile-briefing to handle multi-department results**

Already supports arrays of `departmentResults` — verify it works with 3 departments.

**Step 3: Commit**

```bash
git add src/lib/agents/ceo/index.ts
git commit -m "feat(ceo): update orchestrator to dispatch CIO + COO + CRO"
```

---

### Task 21: Final Verification

**Step 1: Run full test suite**

```bash
pnpm test
```

Expected: All tests pass (111 existing + ~30 new).

**Step 2: Run build**

```bash
pnpm build
```

Expected: Clean build, no type errors.

**Step 3: Commit any final fixes**

---

## Dependency Graph

```
Task 1 (CIO Contract) ──→ Task 2 (CIO Tools) ──→ Task 3 (CIO Agent)
Task 4 (.env.example) ── independent
Task 6 (COO Contract) ──→ Task 7 (COO Tools) ──→ Task 8 (COO Agent) ──→ Task 9 (Auth token)
Task 11 (CRO Enhancement) ── independent of CIO/COO
Task 14-15 (Research Page) ── depends on Task 3 (CIO agent exists)
Task 17-18 (Communications Page) ── depends on Task 8 (COO agent exists)
Task 20 (CEO Integration) ── depends on Tasks 3, 8, 11 (all agents exist)
```

**Parallelizable groups:**
- Group A: Tasks 1-3 (CIO) + Task 4 (.env) in parallel with Tasks 6-9 (COO) + Tasks 11-12 (CRO)
- Group B: Tasks 14-15 (Research) + Tasks 17-18 (Communications) — after Group A
- Group C: Task 20 (CEO Integration) — after Group B
