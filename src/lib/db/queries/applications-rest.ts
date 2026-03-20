/**
 * Applications queries using Supabase REST client.
 * This is the Vercel-compatible version — Drizzle direct postgres fails on serverless.
 * All War Room server components and CRO tools use these.
 */

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineStats {
  total: number;
  discovered: number;
  applied: number;
  screening: number;
  interviewing: number;
  offers: number;
  stale: number;
  weeklyActivity: number;
  conversionRate: number;
  scheduledInterviews: number;
  byStatus: Record<string, number>;
  appliedToScreeningRate: number;
  screeningToInterviewRate: number;
  interviewToOfferRate: number;
  staleCount: number;
  warmCount: number;
  conversionLabel: string;
}

export interface ApplicationRow {
  id: string;
  user_id: string;
  company_id: string | null;
  role: string;
  url: string | null;
  status: string;
  tier: number | null;
  applied_at: string | null;
  source: string | null;
  notes: string | null;
  sector: string | null;
  contact_id: string | null;
  salary: string | null;
  location: string | null;
  position: string | null;
  company_name: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationForAgent {
  id: string;
  companyName: string | null;
  role: string;
  status: string;
  daysSinceActivity: number;
  appliedAt: string | null;
  tier: number | null;
  url: string | null;
  location: string | null;
  salary: string | null;
  sector: string | null;
  notes: string | null;
  source: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STALE_DAYS = 14;
const WARM_DAYS = 7;

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

function rowToAgentFormat(row: ApplicationRow): ApplicationForAgent {
  return {
    id: row.id,
    companyName: row.company_name,
    role: row.role,
    status: row.status,
    daysSinceActivity: daysSince(row.last_activity_at ?? row.created_at),
    appliedAt: row.applied_at,
    tier: row.tier,
    url: row.url,
    location: row.location,
    salary: row.salary,
    sector: row.sector,
    notes: row.notes,
    source: row.source,
  };
}

// ---------------------------------------------------------------------------
// Queries (Supabase REST)
// ---------------------------------------------------------------------------

/**
 * Fetch all applications for a user, ordered by position then created_at.
 */
export async function getApplicationsByUserRest(userId: string): Promise<ApplicationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getApplicationsByUserRest failed:", error.message);
    return [];
  }
  return (data ?? []) as ApplicationRow[];
}

/**
 * Compute pipeline statistics for the CRO agent and dashboard.
 * Uses Supabase REST (Vercel-safe).
 */
export async function getPipelineStatsRest(userId: string): Promise<PipelineStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("status, last_activity_at, created_at, applied_at")
    .eq("user_id", userId);

  if (error) {
    console.error("getPipelineStatsRest failed:", error.message);
    return emptyStats();
  }

  const all = data ?? [];
  const now = new Date();
  const staleMs = STALE_DAYS * 24 * 60 * 60 * 1000;
  const warmMs = WARM_DAYS * 24 * 60 * 60 * 1000;

  const byStatus: Record<string, number> = {};
  let staleCount = 0;
  let warmCount = 0;

  for (const row of all) {
    const s = row.status ?? "discovered";
    byStatus[s] = (byStatus[s] ?? 0) + 1;

    const last = row.last_activity_at ?? row.created_at;
    const diffMs = now.getTime() - new Date(last).getTime();
    if (diffMs >= staleMs) staleCount++;
    else if (diffMs >= warmMs) warmCount++;
  }

  const totalActive = all.filter(
    (r) => !["accepted", "rejected", "withdrawn"].includes(r.status ?? "")
  ).length;

  const applied = byStatus["applied"] ?? 0;
  const screening = byStatus["screening"] ?? 0;
  const interviewScheduled = byStatus["interview_scheduled"] ?? 0;
  const interviewing = byStatus["interviewing"] ?? 0;
  const offer = byStatus["offer"] ?? 0;

  const interviewTotal = interviewScheduled + interviewing;

  const appliedToScreeningRate = applied > 0 ? (screening / applied) * 100 : 0;
  const screeningToInterviewRate =
    screening > 0 ? (interviewTotal / screening) * 100 : 0;
  const interviewToOfferRate =
    interviewTotal > 0 ? (offer / interviewTotal) * 100 : 0;

  const conversionRate = applied > 0 ? (offer / applied) * 100 : 0;
  const conversionLabel = `${conversionRate.toFixed(0)}%`;

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyActivity = all.filter((r) => {
    const last = r.last_activity_at ?? r.created_at;
    return new Date(last) >= weekAgo;
  }).length;

  return {
    total: totalActive,
    discovered: byStatus["discovered"] ?? 0,
    applied,
    screening,
    interviewing: interviewTotal,
    offers: offer,
    stale: staleCount,
    weeklyActivity,
    conversionRate,
    scheduledInterviews: interviewScheduled,
    byStatus,
    appliedToScreeningRate,
    screeningToInterviewRate,
    interviewToOfferRate,
    staleCount,
    warmCount,
    conversionLabel,
  };
}

/**
 * Query applications with filters — used by CRO agent tools.
 */
export async function queryApplicationsForAgent(
  userId: string,
  opts: {
    status?: string[];
    daysStale?: number;
    limit?: number;
    sortBy?: "staleness_desc" | "created_desc" | "company_asc";
  }
): Promise<{ applications: ApplicationForAgent[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId);

  if (opts.status && opts.status.length > 0) {
    query = query.in("status", opts.status);
  }

  if (opts.sortBy === "company_asc") {
    query = query.order("company_name", { ascending: true });
  } else if (opts.sortBy === "created_desc") {
    query = query.order("created_at", { ascending: false });
  } else {
    // staleness_desc — order by last_activity_at asc (oldest activity first = most stale)
    query = query.order("last_activity_at", { ascending: true, nullsFirst: true });
  }

  query = query.limit(opts.limit ?? 50);

  const { data, error } = await query;

  if (error) {
    console.error("queryApplicationsForAgent failed:", error.message);
    return { applications: [], total: 0 };
  }

  let results = ((data ?? []) as ApplicationRow[]).map(rowToAgentFormat);

  // Post-filter by staleness if requested
  if (opts.daysStale) {
    results = results.filter((a) => a.daysSinceActivity >= opts.daysStale!);
  }

  return { applications: results, total: results.length };
}

/**
 * Update an application's status via Supabase REST.
 */
export async function updateApplicationStatusRest(
  userId: string,
  applicationId: string,
  newStatus: string,
  note?: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();

  const updateData: Record<string, string> = {
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Only update status if a real status value was provided
  if (newStatus && newStatus.length > 0) {
    updateData.status = newStatus;
  }

  if (note) {
    // Append note to existing notes
    const { data: existing } = await supabase
      .from("applications")
      .select("notes")
      .eq("id", applicationId)
      .eq("user_id", userId)
      .single();

    const existingNotes = existing?.notes ?? "";
    const timestamp = new Date().toISOString().split("T")[0];
    updateData.notes = existingNotes
      ? `${existingNotes}\n\n[${timestamp}] ${note}`
      : `[${timestamp}] ${note}`;
  }

  const { error } = await supabase
    .from("applications")
    .update(updateData)
    .eq("id", applicationId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, message: `Update failed: ${error.message}` };
  }

  const statusMsg = newStatus && newStatus.length > 0
    ? `Application updated to ${newStatus}.`
    : "Application updated.";
  return { success: true, message: statusMsg };
}

/**
 * Analyze conversion rates for a time window.
 */
export async function analyzeConversionRatesRest(
  userId: string,
  fromDate?: string,
  toDate?: string
): Promise<{
  window: { from: string | null; to: string | null };
  rates: Record<string, { rate: number; count: number; industryAvg: number }>;
  totalAnalyzed: number;
  insight: string;
}> {
  const supabase = await createClient();
  const now = new Date();
  const from = fromDate
    ? new Date(fromDate)
    : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const to = toDate ? new Date(toDate) : now;

  const { data, error } = await supabase
    .from("applications")
    .select("status, created_at")
    .eq("user_id", userId)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());

  if (error || !data || data.length === 0) {
    return {
      window: { from: from.toISOString(), to: to.toISOString() },
      rates: {
        discoveredToApplied: { rate: 0, count: 0, industryAvg: 80 },
        appliedToScreening: { rate: 0, count: 0, industryAvg: 20 },
        screeningToInterview: { rate: 0, count: 0, industryAvg: 25 },
        interviewToOffer: { rate: 0, count: 0, industryAvg: 15 },
      },
      totalAnalyzed: 0,
      insight: "No applications found in this window. Start adding applications to track your pipeline.",
    };
  }

  const byStatus: Record<string, number> = {};
  for (const row of data) {
    const s = row.status ?? "discovered";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  const discovered = byStatus["discovered"] ?? 0;
  const applied = byStatus["applied"] ?? 0;
  const screening = byStatus["screening"] ?? 0;
  const interviewScheduled = byStatus["interview_scheduled"] ?? 0;
  const interviewing = byStatus["interviewing"] ?? 0;
  const offer = byStatus["offer"] ?? 0;

  const interviewTotal = interviewScheduled + interviewing;

  const discoveredToAppliedRate = discovered > 0 ? (applied / discovered) * 100 : 0;
  const appliedToScreeningRate = applied > 0 ? (screening / applied) * 100 : 0;
  const screeningToInterviewRate = screening > 0 ? (interviewTotal / screening) * 100 : 0;
  const interviewToOfferRate = interviewTotal > 0 ? (offer / interviewTotal) * 100 : 0;

  // Generate insight
  const insights: string[] = [];
  if (appliedToScreeningRate < 20) {
    insights.push(`Your applied→screening rate (${appliedToScreeningRate.toFixed(0)}%) is below the 20% industry average. Consider tightening your targeting.`);
  } else {
    insights.push(`Your applied→screening rate (${appliedToScreeningRate.toFixed(0)}%) is at or above industry average. Keep the momentum.`);
  }
  if (screeningToInterviewRate > 25) {
    insights.push(`Strong screening→interview conversion at ${screeningToInterviewRate.toFixed(0)}% — above 25% average.`);
  }

  return {
    window: { from: from.toISOString(), to: to.toISOString() },
    rates: {
      discoveredToApplied: { rate: discoveredToAppliedRate, count: discovered, industryAvg: 80 },
      appliedToScreening: { rate: appliedToScreeningRate, count: applied, industryAvg: 20 },
      screeningToInterview: { rate: screeningToInterviewRate, count: screening, industryAvg: 25 },
      interviewToOffer: { rate: interviewToOfferRate, count: interviewTotal, industryAvg: 15 },
    },
    totalAnalyzed: data.length,
    insight: insights.join(" "),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyStats(): PipelineStats {
  return {
    total: 0,
    discovered: 0,
    applied: 0,
    screening: 0,
    interviewing: 0,
    offers: 0,
    stale: 0,
    weeklyActivity: 0,
    conversionRate: 0,
    scheduledInterviews: 0,
    byStatus: {},
    appliedToScreeningRate: 0,
    screeningToInterviewRate: 0,
    interviewToOfferRate: 0,
    staleCount: 0,
    warmCount: 0,
    conversionLabel: "0%",
  };
}
