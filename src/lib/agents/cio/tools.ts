import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";

const randomHex = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export async function searchCompany(params: {
  query: string;
  maxResults?: number;
}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set");

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

  if (!res.ok) {
    throw new Error(`Tavily API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    results: (data.results ?? []).map(
      (r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url: r.url,
        content: r.content,
      })
    ),
  };
}

export async function scrapeUrl(params: {
  url: string;
  extractFields?: string[];
}) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set");

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

  if (!res.ok) {
    throw new Error(`Firecrawl API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    content: data.data?.markdown ?? data.data?.content ?? "",
    metadata: data.data?.metadata ?? {},
  };
}

export async function lookupSecFilings(params: {
  companyName: string;
  cik?: string;
  filingType?: string;
  limit?: number;
}) {
  try {
    const queryParams = new URLSearchParams({
      q: params.cik ?? params.companyName,
      dateRange: "custom",
      forms: params.filingType ?? "10-K",
    });

    const res = await fetch(
      `https://efts.sec.gov/LATEST/search-index?${queryParams.toString()}`,
      {
        headers: {
          "User-Agent": "ICC armaan@example.com",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      return { filings: [] };
    }

    const data = await res.json();
    const hits = data.hits?.hits ?? [];
    const limit = params.limit ?? 3;

    return {
      filings: hits.slice(0, limit).map(
        (hit: {
          _source: {
            form_type: string;
            file_date: string;
            file_num: string;
            display_names?: string[];
          };
          _id: string;
        }) => ({
          type: hit._source.form_type,
          date: hit._source.file_date,
          url: `https://www.sec.gov/Archives/edgar/data/${hit._id}`,
          description:
            hit._source.display_names?.[0] ?? hit._source.file_num ?? "",
        })
      ),
    };
  } catch {
    return { filings: [] };
  }
}

export async function getEconomicData(params: {
  seriesId: string;
  observationStart?: string;
  limit?: number;
}) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error("FRED_API_KEY is not set");

  const queryParams = new URLSearchParams({
    series_id: params.seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: String(params.limit ?? 10),
  });

  if (params.observationStart) {
    queryParams.set("observation_start", params.observationStart);
  }

  const res = await fetch(
    `https://api.stlouisfed.org/fred/series/observations?${queryParams.toString()}`
  );

  if (!res.ok) {
    throw new Error(`FRED API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    observations: (data.observations ?? []).map(
      (obs: { date: string; value: string }) => ({
        date: obs.date,
        value: obs.value,
      })
    ),
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
  keyPeople?: { name: string; title: string; linkedinUrl?: string }[];
  internshipIntel?: string;
  careersUrl?: string;
  linkedinUrl?: string;
  glassdoorUrl?: string;
}) {
  // Try to find existing company by domain first, then by name
  let existing: { id: string }[] = [];

  if (params.domain) {
    existing = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.domain, params.domain))
      .limit(1);
  }

  if (existing.length === 0) {
    existing = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.name, params.name))
      .limit(1);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    name: params.name,
    updatedAt: now,
  };

  if (params.domain !== undefined) updateData.domain = params.domain;
  if (params.industry !== undefined) updateData.industry = params.industry;
  if (params.sector !== undefined) updateData.sector = params.sector;
  if (params.size !== undefined) updateData.size = params.size;
  if (params.headquarters !== undefined)
    updateData.headquarters = params.headquarters;
  if (params.description !== undefined)
    updateData.description = params.description;
  if (params.cultureSummary !== undefined)
    updateData.cultureSummary = params.cultureSummary;
  if (params.recentNews !== undefined) updateData.recentNews = params.recentNews;
  if (params.financialsSummary !== undefined)
    updateData.financialsSummary = params.financialsSummary;
  if (params.keyPeople !== undefined)
    updateData.keyPeople = JSON.stringify(params.keyPeople);
  if (params.internshipIntel !== undefined)
    updateData.internshipIntel = params.internshipIntel;
  if (params.careersUrl !== undefined) updateData.careersUrl = params.careersUrl;
  if (params.linkedinUrl !== undefined)
    updateData.linkedinUrl = params.linkedinUrl;
  if (params.glassdoorUrl !== undefined)
    updateData.glassdoorUrl = params.glassdoorUrl;

  if (existing.length > 0) {
    const companyId = existing[0]!.id;
    await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, companyId));
    return { companyId, created: false };
  }

  const newId = randomHex();
  const [inserted] = await db
    .insert(companies)
    .values({
      id: newId,
      ...updateData,
      researchFreshness: now,
      createdAt: now,
    } as typeof companies.$inferInsert)
    .returning({ id: companies.id });

  return { companyId: inserted!.id, created: true };
}
