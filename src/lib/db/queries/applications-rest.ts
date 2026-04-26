/**
 * Applications queries using Supabase REST client.
 * This is the Vercel-compatible version — Drizzle direct postgres fails on serverless.
 * All War Room server components and CRO tools use these.
 */

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getApplicationLimit } from "@/lib/stripe/entitlements";
import { log } from "@/lib/logger";
import { buildPipelineStatsFromAggregates } from "./pipeline-stats-from-aggregates";
import type { Application } from "@/db/schema";
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
  ApplicationStatus,
} from "@/lib/validators/application";

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

interface PipelineStatsOptions {
  useAdmin?: boolean;
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
  match_score: string | null;
  deadline_at: string | null;
  deadline_alerts_sent: Record<string, string> | null;
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
    log.error("applications.get_by_user_failed", undefined, {
      userId,
      error: error.message,
    });
    return [];
  }
  return (data ?? []) as ApplicationRow[];
}

/**
 * Compute pipeline statistics for the CRO agent and dashboard.
 * Uses Supabase REST (Vercel-safe).
 */
export async function getPipelineStatsRest(
  userId: string,
  options: PipelineStatsOptions = {}
): Promise<PipelineStats> {
  const supabase = options.useAdmin ? getSupabaseAdmin() : await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("status, last_activity_at, created_at, applied_at")
    .eq("user_id", userId);

  if (error) {
    log.error("applications.pipeline_stats_failed", undefined, {
      userId,
      error: error.message,
      useAdmin: options.useAdmin ?? false,
    });
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

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyActivity = all.filter((r) => {
    const last = r.last_activity_at ?? r.created_at;
    return new Date(last) >= weekAgo;
  }).length;

  return buildPipelineStatsFromAggregates(
    byStatus,
    totalActive,
    staleCount,
    warmCount,
    weeklyActivity,
  );
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
    log.error("applications.query_for_agent_failed", undefined, {
      userId,
      error: error.message,
      opts,
    });
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

  // fire-and-forget match-index rescan (5-min debounced).
  void import("@/lib/networking/match-delta")
    .then((m) => m.enqueueMatchRescan(userId))
    .catch(() => {});

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
// CRUD Mutations (Supabase REST — Vercel-safe)
// ---------------------------------------------------------------------------

/**
 * Map a raw DB row (snake_case) to the Application TypeScript type (camelCase).
 */
function rowToApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id ?? null,
    role: row.role,
    url: row.url ?? null,
    status: row.status as Application["status"],
    tier: row.tier ?? null,
    appliedAt: row.applied_at ? new Date(row.applied_at) : null,
    source: row.source ?? null,
    notes: row.notes ?? null,
    sector: row.sector ?? null,
    contactId: row.contact_id ?? null,
    salary: row.salary ?? null,
    location: row.location ?? null,
    position: row.position ?? null,
    companyName: row.company_name ?? null,
    lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : null,
    matchScore: row.match_score ?? null,
    deadlineAt: row.deadline_at ? new Date(row.deadline_at) : null,
    deadlineAlertsSent: row.deadline_alerts_sent ?? {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export type NewApplicationRestInput = CreateApplicationInput & { userId: string };

/**
 * INSERT a new application into the DB and return the created row.
 */
export async function createApplicationRest(
  input: NewApplicationRestInput
): Promise<Application> {
  const supabase = await createClient();
  const limit = await getApplicationLimit(input.userId);

  if (Number.isFinite(limit)) {
    const { count, error: countError } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId);

    if (countError) {
      throw new Error(`Unable to validate application limit: ${countError.message}`);
    }

    if ((count ?? 0) >= limit) {
      throw new Error(
        `Application limit reached for your current plan (${limit}). Upgrade to add more.`
      );
    }
  }

  const now = new Date().toISOString();
  const isApplied = input.status && input.status !== "discovered";

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: input.userId,
      company_name: input.companyName,
      role: input.role,
      url: input.url ?? null,
      status: input.status ?? "discovered",
      source: input.source ?? null,
      notes: input.notes ?? null,
      location: input.location ?? null,
      salary: input.salary ?? null,
      sector: input.sector ?? null,
      tier: input.tier ?? null,
      applied_at: isApplied ? now : null,
      last_activity_at: now,
      updated_at: now,
      deadline_at: input.deadlineAt ? new Date(input.deadlineAt).toISOString() : null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`createApplicationRest failed: ${error?.message ?? "no data returned"}`);
  }

  // fire-and-forget match-index rescan (5-min debounced).
  void import("@/lib/networking/match-delta")
    .then((m) => m.enqueueMatchRescan(input.userId))
    .catch(() => {});

  return rowToApplication(data as ApplicationRow);
}

/**
 * UPDATE an existing application (partial fields) and return the updated row.
 */
export async function updateApplicationRest(
  userId: string,
  id: string,
  input: UpdateApplicationInput
): Promise<Application> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  // Build a snake_case update payload, only including defined values
  const updatePayload: Record<string, unknown> = {
    updated_at: now,
    last_activity_at: now,
  };

  if (input.companyName !== undefined) updatePayload.company_name = input.companyName;
  if (input.role !== undefined) updatePayload.role = input.role;
  if (input.url !== undefined) updatePayload.url = input.url || null;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.source !== undefined) updatePayload.source = input.source || null;
  if (input.notes !== undefined) updatePayload.notes = input.notes || null;
  if (input.location !== undefined) updatePayload.location = input.location || null;
  if (input.salary !== undefined) updatePayload.salary = input.salary || null;
  if (input.sector !== undefined) updatePayload.sector = input.sector || null;
  if (input.tier !== undefined) updatePayload.tier = input.tier ?? null;
  if (input.deadlineAt !== undefined) {
    updatePayload.deadline_at = input.deadlineAt
      ? new Date(input.deadlineAt).toISOString()
      : null;
  }

  const { data, error } = await supabase
    .from("applications")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`updateApplicationRest failed: ${error?.message ?? "no data returned"}`);
  }

  // fire-and-forget match-index rescan (5-min debounced).
  void import("@/lib/networking/match-delta")
    .then((m) => m.enqueueMatchRescan(userId))
    .catch(() => {});

  return rowToApplication(data as ApplicationRow);
}

/**
 * UPDATE status + position + timestamps for drag-and-drop moves. Returns the updated row.
 */
export async function moveApplicationRest(
  userId: string,
  id: string,
  newStatus: ApplicationStatus,
  newPosition?: string
): Promise<Application> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
    last_activity_at: now,
  };

  if (newPosition !== undefined) {
    updatePayload.position = newPosition;
  }

  const { data, error } = await supabase
    .from("applications")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`moveApplicationRest failed: ${error?.message ?? "no data returned"}`);
  }

  return rowToApplication(data as ApplicationRow);
}

/**
 * DELETE an application by id where user_id matches.
 */
export async function deleteApplicationRest(
  userId: string,
  id: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`deleteApplicationRest failed: ${error.message}`);
  }
}

/**
 * Bulk UPDATE multiple applications to a new status.
 */
export async function bulkUpdateStatusRest(
  userId: string,
  ids: string[],
  newStatus: ApplicationStatus
): Promise<void> {
  if (ids.length === 0) return;

  const supabase = await createClient();

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("applications")
    .update({
      status: newStatus,
      updated_at: now,
      last_activity_at: now,
    })
    .in("id", ids)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`bulkUpdateStatusRest failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Analytics Queries (Phase 5)
// ---------------------------------------------------------------------------

export interface TimelineWeek {
  week: string;       // ISO date string for the Monday of the week
  count: number;      // Applications created that week
}

export interface FunnelStage {
  status: string;
  count: number;
}

export interface DailyActivity {
  date: string;       // YYYY-MM-DD
  count: number;      // Applications with activity on that date
}

export interface AgentUsageStat {
  agent: string;
  runs: number;
  successRate: number;  // 0–100
  totalTokens: number;
}

/**
 * Returns application counts grouped by ISO week (Monday-anchored) for trend charts.
 */
export async function getApplicationTimelineRest(
  userId: string
): Promise<TimelineWeek[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    log.error("applications.timeline_failed", undefined, {
      userId,
      error: error.message,
    });
    return [];
  }

  const weekMap = new Map<string, number>();

  for (const row of data ?? []) {
    const d = new Date(row.created_at);
    // Find the Monday of the week
    const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);
    const key = monday.toISOString().split("T")[0];
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  }

  return Array.from(weekMap.entries()).map(([week, count]) => ({ week, count }));
}

/**
 * Returns counts per status for funnel visualization.
 */
export async function getConversionFunnelRest(
  userId: string
): Promise<FunnelStage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select("status")
    .eq("user_id", userId);

  if (error) {
    log.error("applications.conversion_funnel_failed", undefined, {
      userId,
      error: error.message,
    });
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const s = row.status ?? "discovered";
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }

  // Return in funnel order
  const FUNNEL_ORDER = [
    "discovered",
    "applied",
    "screening",
    "interview_scheduled",
    "interviewing",
    "under_review",
    "offer",
    "accepted",
    "rejected",
    "withdrawn",
  ];

  return FUNNEL_ORDER
    .filter((s) => counts.has(s))
    .map((s) => ({ status: s, count: counts.get(s) ?? 0 }));
}

/**
 * Returns count of applications with activity per day for heatmap.
 * `days` controls how many days back to look (default 90).
 */
export async function getDailyActivityRest(
  userId: string,
  days = 90
): Promise<DailyActivity[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("applications")
    .select("last_activity_at, created_at")
    .eq("user_id", userId)
    .gte("last_activity_at", since.toISOString());

  if (error) {
    log.error("applications.daily_activity_failed", undefined, {
      userId,
      days,
      error: error.message,
    });
    return [];
  }

  const dayMap = new Map<string, number>();

  for (const row of data ?? []) {
    const ts = row.last_activity_at ?? row.created_at;
    const dateKey = new Date(ts).toISOString().split("T")[0];
    dayMap.set(dateKey, (dayMap.get(dateKey) ?? 0) + 1);
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

/**
 * Reads agent_logs table and returns per-agent run counts + success rates.
 */
export async function getAgentUsageStatsRest(
  userId: string
): Promise<AgentUsageStat[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agent_logs")
    .select("agent, status, tokens_used")
    .eq("user_id", userId);

  if (error) {
    log.error("applications.agent_usage_failed", undefined, {
      userId,
      error: error.message,
    });
    return [];
  }

  interface AgentAccum {
    runs: number;
    completed: number;
    totalTokens: number;
  }

  const agentMap = new Map<string, AgentAccum>();

  for (const row of data ?? []) {
    const agent = row.agent ?? "unknown";
    const existing = agentMap.get(agent) ?? { runs: 0, completed: 0, totalTokens: 0 };
    existing.runs += 1;
    if (row.status === "completed") existing.completed += 1;
    existing.totalTokens += row.tokens_used ?? 0;
    agentMap.set(agent, existing);
  }

  return Array.from(agentMap.entries()).map(([agent, accum]) => ({
    agent,
    runs: accum.runs,
    successRate: accum.runs > 0 ? Math.round((accum.completed / accum.runs) * 100) : 0,
    totalTokens: accum.totalTokens,
  }));
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
