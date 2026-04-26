import { tool } from "ai";
import { z } from "zod/v4";
import {
  getCompanyById,
  getCompaniesByUser,
  getCompaniesForAgent,
  updateCompanyResearch,
  searchCompaniesByName,
} from "@/lib/db/queries/companies-rest";
import type { CompanyForAgent } from "@/lib/db/queries/companies-rest";
import {
  findSimilarCompanies as findSimilarCompaniesVector,
  upsertCompanyEmbedding,
} from "@/lib/db/queries/embeddings-rest";
import { writeSharedKnowledge } from "@/lib/db/queries/shared-knowledge-rest";

// ---------------------------------------------------------------------------
// Internal helper — synthesize a one-sentence shared-knowledge summary from
// the non-null fields the CIO just wrote. Truncated to ~300 chars so the
// shared_knowledge JSON column stays small and the consuming agent's prompt
// stays cheap to cache.
// ---------------------------------------------------------------------------
function buildIntelSummary(fields: {
  description?: string;
  cultureSummary?: string;
  recentNews?: string;
  financialsSummary?: string;
  internshipIntel?: string;
}): string {
  const parts: string[] = [];
  // Order is meaningful — culture and recent news lead because CRO and the
  // CEO synthesizer most often want them when staging a deal narrative.
  if (fields.cultureSummary) parts.push(`Culture: ${fields.cultureSummary}`);
  if (fields.recentNews) parts.push(`Recent: ${fields.recentNews}`);
  if (fields.financialsSummary)
    parts.push(`Financials: ${fields.financialsSummary}`);
  if (fields.internshipIntel)
    parts.push(`Internships: ${fields.internshipIntel}`);
  if (fields.description) parts.push(`About: ${fields.description}`);

  const joined = parts.join(". ");
  if (joined.length <= 300) return joined;
  // Hard truncate at the nearest space boundary before 297 chars + ellipsis.
  const slice = joined.slice(0, 297);
  const lastSpace = slice.lastIndexOf(" ");
  return `${lastSpace > 240 ? slice.slice(0, lastSpace) : slice}...`;
}

// ---------------------------------------------------------------------------
// Tool 1: researchCompany
// ---------------------------------------------------------------------------
export function makeResearchCompanyTool(userId: string) {
  return tool({
    description:
      "Look up a company by name from the user's research database. Returns stored intel including financials, culture, recent news, and internship data. If no data exists, returns a message suggesting the user request fresh research.",
    inputSchema: z.object({
      companyName: z
        .string()
        .min(1)
        .describe("The company name to look up — partial matches are supported"),
    }),
    execute: async (input) => {
      const matches = await searchCompaniesByName(userId, input.companyName);

      if (matches.length === 0) {
        return {
          found: false,
          companyName: input.companyName,
          message: `No research found for "${input.companyName}". Ask the user to add this company to their target list so intel can be gathered before their next interaction.`,
        };
      }

      // Return the best match (first result from text search)
      const company = matches[0];
      const daysSinceUpdate = company.researchFreshness
        ? Math.floor(
            (Date.now() - new Date(company.researchFreshness).getTime()) /
              (24 * 60 * 60 * 1000)
          )
        : null;

      return {
        found: true,
        company,
        staleWarning:
          daysSinceUpdate !== null && daysSinceUpdate > 30
            ? `Note: this intel is ${daysSinceUpdate} days old — verify key facts before your interview.`
            : null,
        alternateMatches: matches.length > 1 ? matches.slice(1).map((c) => c.name) : [],
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 2: getCompanyList
// ---------------------------------------------------------------------------
export function makeGetCompanyListTool(userId: string) {
  return tool({
    description:
      "List all companies the user has researched, with freshness indicators showing how current the intel is. Use this to give the user an overview of their research database.",
    inputSchema: z.object({
      filterFresh: z
        .boolean()
        .default(false)
        .describe("If true, return only companies updated in the last 30 days"),
      filterStale: z
        .boolean()
        .default(false)
        .describe("If true, return only companies with intel older than 30 days"),
      sector: z
        .string()
        .optional()
        .describe("Filter by sector, e.g. 'Real Estate', 'Finance', 'Technology'"),
    }),
    execute: async (input) => {
      const now = Date.now();
      const staleCutoff = 30 * 24 * 60 * 60 * 1000;

      const opts: { sector?: string; staleDays?: number } = {};
      if (input.sector) opts.sector = input.sector;
      if (input.filterStale) opts.staleDays = 30;

      const companies = await getCompaniesForAgent(userId, opts);

      let filtered = companies;
      if (input.filterFresh) {
        filtered = companies.filter(
          (c) =>
            c.researchFreshness !== null &&
            now - new Date(c.researchFreshness).getTime() <= staleCutoff
        );
      }
      if (input.filterStale) {
        filtered = companies.filter(
          (c) =>
            c.researchFreshness === null ||
            now - new Date(c.researchFreshness).getTime() > staleCutoff
        );
      }

      const withFreshness = filtered.map((c) => {
        const daysSince =
          c.researchFreshness !== null
            ? Math.floor(
                (now - new Date(c.researchFreshness).getTime()) / (24 * 60 * 60 * 1000)
              )
            : null;

        return {
          id: c.id,
          name: c.name,
          sector: c.sector,
          industry: c.industry,
          tier: c.tier,
          freshnessLabel:
            daysSince === null
              ? "Never researched"
              : daysSince === 0
                ? "Updated today"
                : daysSince <= 7
                  ? `Updated ${daysSince}d ago`
                  : daysSince <= 30
                    ? `Updated ${daysSince}d ago`
                    : `STALE — ${daysSince}d ago`,
          isStale: daysSince === null || daysSince > 30,
        };
      });

      return {
        total: withFreshness.length,
        staleCount: withFreshness.filter((c) => c.isStale).length,
        companies: withFreshness,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 3: compareCompanies
// ---------------------------------------------------------------------------
export function makeCompareCompaniesTool(userId: string) {
  return tool({
    description:
      "Compare 2 or 3 companies side-by-side on key dimensions: size, industry, culture, recent news, and internship intel. Use this when the user wants to evaluate options or prepare for multiple interviews at once.",
    inputSchema: z.object({
      companyNames: z
        .array(z.string().min(1))
        .min(2)
        .max(3)
        .describe("2 or 3 company names to compare"),
    }),
    execute: async (input) => {
      const results = await Promise.all(
        input.companyNames.map((name) => searchCompaniesByName(userId, name))
      );

      const companies: Array<CompanyForAgent | null> = results.map(
        (matches) => matches[0] ?? null
      );

      const found = companies.filter((c): c is CompanyForAgent => c !== null);
      const notFound = input.companyNames.filter(
        (name, i) => companies[i] === null
      );

      if (found.length === 0) {
        return {
          success: false,
          message: `No research found for any of: ${input.companyNames.join(", ")}. Research these companies first.`,
        };
      }

      const comparison = found.map((c) => {
        const daysSince =
          c.researchFreshness !== null
            ? Math.floor(
                (Date.now() - new Date(c.researchFreshness).getTime()) /
                  (24 * 60 * 60 * 1000)
              )
            : null;

        return {
          name: c.name,
          sector: c.sector ?? "Unknown",
          industry: c.industry ?? "Unknown",
          employeeCount: c.employeeCount ?? "Unknown",
          tier: c.tier ?? "Unranked",
          recentNews: c.recentNews
            ? c.recentNews.slice(0, 200) + (c.recentNews.length > 200 ? "…" : "")
            : "No recent news on file",
          cultureSummary: c.cultureSummary
            ? c.cultureSummary.slice(0, 200) + (c.cultureSummary.length > 200 ? "…" : "")
            : "No culture data on file",
          internshipIntel: c.internshipIntel
            ? c.internshipIntel.slice(0, 200) + (c.internshipIntel.length > 200 ? "…" : "")
            : "No internship intel on file",
          staleness:
            daysSince === null
              ? "Never researched"
              : daysSince > 30
                ? `STALE (${daysSince}d old)`
                : `Fresh (${daysSince}d old)`,
        };
      });

      return {
        success: true,
        compared: comparison,
        notFound: notFound.length > 0 ? notFound : undefined,
        warning:
          notFound.length > 0
            ? `No research found for: ${notFound.join(", ")}. Comparison is partial.`
            : undefined,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 4: findSimilarCompanies
// ---------------------------------------------------------------------------
export function makeFindSimilarCompaniesTool(userId: string) {
  return tool({
    description:
      "Given a company name, find similar companies in the user's research database. Matches on sector, industry, and size tier. Useful for identifying peer companies and expanding the target list.",
    inputSchema: z.object({
      companyName: z
        .string()
        .min(1)
        .describe("The reference company to find peers for"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(5)
        .describe("Maximum number of similar companies to return"),
    }),
    execute: async (input) => {
      // First, look up the reference company
      const matches = await searchCompaniesByName(userId, input.companyName);

      if (matches.length === 0) {
        return {
          found: false,
          message: `No research found for "${input.companyName}". Cannot find peers without a reference profile.`,
        };
      }

      const reference = matches[0];

      // Fetch all companies and filter by matching sector/industry/tier
      const allCompanies = await getCompaniesByUser(userId);
      const similar = allCompanies
        .filter((c) => {
          if (c.id === reference.id) return false;
          if (reference.sector && c.sector === reference.sector) return true;
          if (reference.industry && c.industry === reference.industry) return true;
          if (reference.tier !== null && c.tier === reference.tier) return true;
          return false;
        })
        .slice(0, input.limit)
        .map((c) => ({
          id: c.id,
          name: c.name,
          sector: c.sector,
          industry: c.industry,
          tier: c.tier,
          matchReason: [
            reference.sector && c.sector === reference.sector ? `same sector (${c.sector})` : null,
            reference.industry && c.industry === reference.industry
              ? `same industry (${c.industry})`
              : null,
            reference.tier !== null && c.tier === reference.tier
              ? `same tier (${c.tier})`
              : null,
          ]
            .filter(Boolean)
            .join(", "),
        }));

      return {
        found: true,
        reference: { name: reference.name, sector: reference.sector, industry: reference.industry, tier: reference.tier },
        similar,
        note:
          similar.length === 0
            ? "No peer companies found in the research database yet. Consider researching companies in the same sector to build a comparison set."
            : `Found ${similar.length} peer ${similar.length === 1 ? "company" : "companies"} based on sector/industry/tier matching. (Full pgvector similarity search coming soon.)`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 5: updateCompanyIntel
// ---------------------------------------------------------------------------
export function makeUpdateCompanyIntelTool(userId: string) {
  return tool({
    description:
      "Update a company's research profile with fresh intel. Use this to record new information about a company — description, culture notes, recent news, financial highlights, or internship-specific intel. Sets the research freshness timestamp to now.",
    inputSchema: z.object({
      companyId: z
        .string()
        .describe("UUID of the company to update"),
      description: z
        .string()
        .max(2000)
        .optional()
        .describe("Company overview — what they do, market position, size"),
      cultureSummary: z
        .string()
        .max(2000)
        .optional()
        .describe("Culture and workplace notes — Glassdoor themes, interview feedback, internal reputation"),
      recentNews: z
        .string()
        .max(2000)
        .optional()
        .describe("Recent news, announcements, or market events affecting this company"),
      financialsSummary: z
        .string()
        .max(2000)
        .optional()
        .describe("Financial highlights — revenue, growth, key metrics, recent filings"),
      internshipIntel: z
        .string()
        .max(2000)
        .optional()
        .describe("Internship-specific intel — program structure, conversion rates, application tips, known interviewers"),
    }),
    execute: async (input) => {
      const { companyId, ...fields } = input;

      // Only pass fields that were actually provided
      const updateData: {
        description?: string;
        cultureSummary?: string;
        recentNews?: string;
        financialsSummary?: string;
        internshipIntel?: string;
      } = {};

      if (fields.description !== undefined) updateData.description = fields.description;
      if (fields.cultureSummary !== undefined) updateData.cultureSummary = fields.cultureSummary;
      if (fields.recentNews !== undefined) updateData.recentNews = fields.recentNews;
      if (fields.financialsSummary !== undefined) updateData.financialsSummary = fields.financialsSummary;
      if (fields.internshipIntel !== undefined) updateData.internshipIntel = fields.internshipIntel;

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          message: "No fields provided to update. Specify at least one of: description, cultureSummary, recentNews, financialsSummary, internshipIntel.",
        };
      }

      const result = await updateCompanyResearch(userId, companyId, updateData);

      // broadcast the confirmed intel delta to the shared-knowledge
      // bus so sibling agents (CRO especially) see it on their next dispatch.
      // Only fire on confirmed success: a failed Supabase update would leave
      // peers chasing intel the row never received.
      if (result.success) {
        const summary = buildIntelSummary(updateData);
        if (summary.length > 0) {
          await writeSharedKnowledge(
            userId,
            "cio",
            `company:${companyId}:intel`,
            summary,
          );
        }
      }

      return result;
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 6: semanticCompanySearch
// ---------------------------------------------------------------------------
export function makeSemanticCompanySearchTool(userId: string) {
  return tool({
    description:
      "Search the company research database using semantic similarity (pgvector). Finds companies related to a natural language query — e.g. 'fintech companies focused on payments' or 'fast-growing startups in healthcare'. More powerful than text search for conceptual matching.",
    inputSchema: z.object({
      query: z
        .string()
        .min(3)
        .describe(
          "Natural language search query describing the kind of company you're looking for"
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(5)
        .describe("Maximum number of results to return"),
    }),
    execute: async (input) => {
      const results = await findSimilarCompaniesVector(
        userId,
        input.query,
        input.limit,
        0.65
      );

      if (results.length === 0) {
        return {
          found: false,
          message: `No semantically similar companies found for "${input.query}". This may mean no company embeddings have been generated yet, or no companies match the concept.`,
        };
      }

      return {
        found: true,
        query: input.query,
        results: results.map((r) => ({
          companyId: r.companyId,
          companyName: r.companyName,
          similarity: Math.round(r.similarity * 100) + "%",
          matchedContent: r.content.slice(0, 200),
        })),
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 7: embedCompanyResearch
// ---------------------------------------------------------------------------
export function makeEmbedCompanyResearchTool(userId: string) {
  return tool({
    description:
      "Generate or refresh the vector embedding for a company's research profile. Run this after updating a company's intel to enable semantic search. Requires OPENAI_API_KEY.",
    inputSchema: z.object({
      companyId: z.string().describe("UUID of the company to embed"),
    }),
    execute: async (input) => {
      const company = await getCompanyById(userId, input.companyId);
      if (!company) {
        return {
          success: false,
          message: "Company not found or you don't have access.",
        };
      }

      return upsertCompanyEmbedding(userId, input.companyId, {
        name: company.name,
        sector: company.sector,
        industry: company.industry,
        description: company.description,
        cultureSummary: company.cultureSummary,
        recentNews: company.recentNews,
        internshipIntel: company.internshipIntel,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience: build all tools for a given user session
// ---------------------------------------------------------------------------
export function buildCIOTools(userId: string) {
  return {
    researchCompany: makeResearchCompanyTool(userId),
    getCompanyList: makeGetCompanyListTool(userId),
    compareCompanies: makeCompareCompaniesTool(userId),
    findSimilarCompanies: makeFindSimilarCompaniesTool(userId),
    updateCompanyIntel: makeUpdateCompanyIntelTool(userId),
    semanticCompanySearch: makeSemanticCompanySearchTool(userId),
    embedCompanyResearch: makeEmbedCompanyResearchTool(userId),
  };
}
