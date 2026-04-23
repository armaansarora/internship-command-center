/**
 * Companies queries using Supabase REST client.
 * This is the Vercel-compatible version — Drizzle direct postgres fails on serverless.
 * All CIO agent tools and research components use these.
 */

import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw snake_case row from the companies table */
export interface CompanyRow {
  id: string;
  user_id: string;
  name: string;
  sector: string | null;
  industry: string | null;
  // Note: `employee_count`, `website`, `notes` are type-only placeholders.
  // The columns don't exist on the `companies` table; these fields always
  // emit `null` so consumers see a stable shape rather than `undefined`.
  employee_count: string | null;
  headquarters: string | null;
  website: string | null;
  description: string | null;
  culture_summary: string | null;
  recent_news: string | null;
  financials_summary: string | null;
  internship_intel: string | null;
  research_freshness: string | null;
  tier: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** camelCase version used in agent tools and UI components */
export interface CompanyForAgent {
  id: string;
  name: string;
  sector: string | null;
  industry: string | null;
  // Note: see CompanyRow above. `employeeCount`, `website`, `notes` are
  // type-only placeholders; values always emit `null`.
  employeeCount: string | null;
  headquarters: string | null;
  website: string | null;
  description: string | null;
  cultureSummary: string | null;
  recentNews: string | null;
  financialsSummary: string | null;
  internshipIntel: string | null;
  researchFreshness: string | null;
  tier: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Aggregate research stats for the CIO system prompt */
export interface ResearchStats {
  companiesResearched: number;
  staleResearch: number;       // >30 days old
  recentResearch: number;      // last 7 days
  targetCompanies: string[];   // company names in the database
  recentCompanies: string[];   // companies updated in the last 7 days
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STALE_DAYS = 30;
const RECENT_DAYS = 7;

function rowToAgentFormat(row: CompanyRow): CompanyForAgent {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector,
    industry: row.industry,
    // Columns don't exist; emit stable nulls.
    employeeCount: null,
    headquarters: row.headquarters,
    website: null,
    description: row.description,
    cultureSummary: row.culture_summary,
    recentNews: row.recent_news,
    financialsSummary: row.financials_summary,
    internshipIntel: row.internship_intel,
    researchFreshness: row.research_freshness,
    tier: row.tier,
    notes: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Queries (Supabase REST)
// ---------------------------------------------------------------------------

/**
 * Fetch all companies for a user, ordered by tier then name.
 */
export async function getCompaniesByUser(userId: string): Promise<CompanyForAgent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .order("tier", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    log.error("companies.get_by_user_failed", undefined, {
      userId,
      error: error.message,
    });
    return [];
  }
  return ((data ?? []) as CompanyRow[]).map(rowToAgentFormat);
}

/**
 * Fetch a single company by ID with full data.
 */
export async function getCompanyById(
  userId: string,
  companyId: string
): Promise<CompanyForAgent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .eq("id", companyId)
    .single();

  if (error || !data) {
    if (error) {
      log.error("companies.get_by_id_failed", undefined, {
        userId,
        companyId,
        error: error.message,
      });
    }
    return null;
  }
  return rowToAgentFormat(data as CompanyRow);
}

/**
 * Compute aggregate research stats for the CIO dynamic context.
 */
export async function getResearchStats(userId: string): Promise<ResearchStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("name, research_freshness")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error || !data) {
    if (error) {
      log.error("companies.get_research_stats_failed", undefined, {
        userId,
        error: error.message,
      });
    }
    return {
      companiesResearched: 0,
      staleResearch: 0,
      recentResearch: 0,
      targetCompanies: [],
      recentCompanies: [],
    };
  }

  const now = Date.now();
  const staleCutoffMs = STALE_DAYS * 24 * 60 * 60 * 1000;
  const recentCutoffMs = RECENT_DAYS * 24 * 60 * 60 * 1000;

  let staleResearch = 0;
  let recentResearch = 0;
  const recentCompanies: string[] = [];

  for (const row of data) {
    if (!row.research_freshness) {
      staleResearch++;
      continue;
    }

    const ageMs = now - new Date(row.research_freshness).getTime();

    if (ageMs > staleCutoffMs) {
      staleResearch++;
    } else if (ageMs <= recentCutoffMs) {
      recentResearch++;
      recentCompanies.push(row.name as string);
    }
  }

  return {
    companiesResearched: data.length,
    staleResearch,
    recentResearch,
    targetCompanies: (data as Array<{ name: string }>).map((r) => r.name),
    recentCompanies,
  };
}

/**
 * Fetch companies with optional filters — used by CIO agent tools.
 */
export async function getCompaniesForAgent(
  userId: string,
  opts: {
    sector?: string;
    tier?: number;
    staleDays?: number;
  } = {}
): Promise<CompanyForAgent[]> {
  const supabase = await createClient();

  let query = supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId);

  if (opts.sector) {
    query = query.eq("sector", opts.sector);
  }

  if (opts.tier !== undefined) {
    query = query.eq("tier", opts.tier);
  }

  if (opts.staleDays !== undefined) {
    const cutoff = new Date(
      Date.now() - opts.staleDays * 24 * 60 * 60 * 1000
    ).toISOString();
    // Fetch companies where research_freshness is null OR older than cutoff
    // Supabase: OR filter requires .or()
    query = query.or(`research_freshness.is.null,research_freshness.lt.${cutoff}`);
  }

  query = query
    .order("tier", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const { data, error } = await query;

  if (error) {
    log.error("companies.get_for_agent_failed", undefined, {
      userId,
      opts,
      error: error.message,
    });
    return [];
  }
  return ((data ?? []) as CompanyRow[]).map(rowToAgentFormat);
}

/**
 * Insert a new company record for a user.
 */
export async function createCompanyRest(
  userId: string,
  data: {
    name: string;
    sector?: string;
    industry?: string;
    employeeCount?: string;
    headquarters?: string;
    website?: string;
    description?: string;
    cultureSummary?: string;
    recentNews?: string;
    financialsSummary?: string;
    internshipIntel?: string;
    tier?: number;
    notes?: string;
  }
): Promise<{ success: boolean; company: CompanyForAgent | null; message: string }> {
  const supabase = await createClient();

  const insertRow: Record<string, unknown> = {
    user_id: userId,
    name: data.name,
    research_freshness: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (data.sector !== undefined) insertRow.sector = data.sector;
  if (data.industry !== undefined) insertRow.industry = data.industry;
  // Note: `employee_count`, `website`, `notes` inputs are accepted at the
  // boundary for forward compatibility but silently dropped here — columns
  // don't exist on `companies`. Do not re-enable these writes without a
  // Drizzle migration first.
  if (data.headquarters !== undefined) insertRow.headquarters = data.headquarters;
  if (data.description !== undefined) insertRow.description = data.description;
  if (data.cultureSummary !== undefined) insertRow.culture_summary = data.cultureSummary;
  if (data.recentNews !== undefined) insertRow.recent_news = data.recentNews;
  if (data.financialsSummary !== undefined) insertRow.financials_summary = data.financialsSummary;
  if (data.internshipIntel !== undefined) insertRow.internship_intel = data.internshipIntel;
  if (data.tier !== undefined) insertRow.tier = data.tier;

  const { data: created, error } = await supabase
    .from("companies")
    .insert(insertRow)
    .select()
    .single();

  if (error || !created) {
    return { success: false, company: null, message: `Insert failed: ${error?.message ?? "unknown error"}` };
  }

  return {
    success: true,
    company: rowToAgentFormat(created as CompanyRow),
    message: `Company "${data.name}" added to the research database.`,
  };
}

/**
 * Update research fields for an existing company. Sets research_freshness to now.
 */
export async function updateCompanyResearch(
  userId: string,
  companyId: string,
  data: {
    description?: string;
    cultureSummary?: string;
    recentNews?: string;
    financialsSummary?: string;
    internshipIntel?: string;
  }
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();

  const updateRow: Record<string, unknown> = {
    research_freshness: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (data.description !== undefined) updateRow.description = data.description;
  if (data.cultureSummary !== undefined) updateRow.culture_summary = data.cultureSummary;
  if (data.recentNews !== undefined) updateRow.recent_news = data.recentNews;
  if (data.financialsSummary !== undefined) updateRow.financials_summary = data.financialsSummary;
  if (data.internshipIntel !== undefined) updateRow.internship_intel = data.internshipIntel;

  const { error } = await supabase
    .from("companies")
    .update(updateRow)
    .eq("id", companyId)
    .eq("user_id", userId);

  if (error) {
    log.error("companies.update_research_failed", undefined, {
      userId,
      companyId,
      error: error.message,
    });
    return { success: false, message: `Update failed: ${error.message}` };
  }

  return { success: true, message: `Research profile updated. Intel freshness reset to now.` };
}

/**
 * Fetch companies with research older than daysOld, or never researched.
 */
export async function getStaleResearch(
  userId: string,
  daysOld: number
): Promise<CompanyForAgent[]> {
  const supabase = await createClient();
  const cutoff = new Date(
    Date.now() - daysOld * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .or(`research_freshness.is.null,research_freshness.lt.${cutoff}`)
    .order("research_freshness", { ascending: true, nullsFirst: true });

  if (error) {
    log.error("companies.get_stale_research_failed", undefined, {
      userId,
      daysOld,
      error: error.message,
    });
    return [];
  }
  return ((data ?? []) as CompanyRow[]).map(rowToAgentFormat);
}

/**
 * Text search on company name — case-insensitive partial match.
 * Used by the CIO agent to resolve company names from conversational input.
 */
export async function searchCompaniesByName(
  userId: string,
  query: string
): Promise<CompanyForAgent[]> {
  const supabase = await createClient();

  // Supabase ilike for case-insensitive partial match
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", `%${query}%`)
    .order("tier", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true })
    .limit(10);

  if (error) {
    log.error("companies.search_by_name_failed", undefined, {
      userId,
      query,
      error: error.message,
    });
    return [];
  }
  return ((data ?? []) as CompanyRow[]).map(rowToAgentFormat);
}
