import { createClient } from "@/lib/supabase/server";
import type { Application } from "@/db/schema";
import type {
  UpdateApplicationInput,
  ApplicationStatus,
} from "@/lib/validators/application";
import type { NewApplicationInput } from "./application-types";
import {
  buildPipelineStatsFromAggregates,
  type PipelineStats,
} from "./pipeline-stats-from-aggregates";

export type { NewApplicationInput } from "./application-types";

// Re-export for consumers
export type { Application };

export type { PipelineStats };
export { buildPipelineStatsFromAggregates };

// ---------------------------------------------------------------------------
// Row mapping (PostgREST → Drizzle-shaped Application for the UI)
// ---------------------------------------------------------------------------

interface ApplicationRow {
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

function fromRow(row: ApplicationRow): Application {
  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,
    role: row.role,
    url: row.url,
    status: row.status as Application["status"],
    tier: row.tier,
    appliedAt: row.applied_at ? new Date(row.applied_at) : null,
    source: row.source,
    notes: row.notes,
    sector: row.sector,
    contactId: row.contact_id,
    salary: row.salary,
    location: row.location,
    position: row.position,
    companyName: row.company_name,
    lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function assertNoError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

const STALE_DAYS = 14;

// ---------------------------------------------------------------------------
// Queries — Supabase session client so Postgres RLS (auth.uid()) applies
// ---------------------------------------------------------------------------

/**
 * Return all applications for a user, ordered by status then position (kanban order).
 */
export async function getApplicationsByUser(userId: string): Promise<Application[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("status", { ascending: true })
    .order("position", { ascending: true });

  assertNoError(error, "getApplicationsByUser");
  return (data as ApplicationRow[] | null)?.map(fromRow) ?? [];
}

/**
 * War Room board: primary sort by position, then newest first.
 * Default cap 800 cards; raise if power users need more (Phase 3 guardrail).
 */
export async function getApplicationsForWarRoom(
  userId: string,
  opts?: { limit?: number }
): Promise<Application[]> {
  const cap = Math.min(Math.max(opts?.limit ?? 800, 1), 5000);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(cap);

  assertNoError(error, "getApplicationsForWarRoom");
  return (data as ApplicationRow[] | null)?.map(fromRow) ?? [];
}

export type CROQuerySort = "staleness_desc" | "created_desc" | "company_asc";

/**
 * Bounded query for CRO agent tools (max 100 rows server-side).
 */
export async function queryApplicationsForAgent(
  userId: string,
  params: {
    statuses?: ApplicationStatus[];
    daysStale?: number;
    limit: number;
    sortBy: CROQuerySort;
  }
): Promise<{
  applications: Array<{
    id: string;
    companyName: string | null;
    role: string;
    status: string;
    daysSinceActivity: number;
    appliedAt: string | null;
    tier: number | null;
  }>;
  /** Rows returned after filters (max `rowLimit`). */
  total: number;
  rowLimit: number;
}> {
  const rowLimit = Math.min(Math.max(params.limit, 1), 100);
  const supabase = await createClient();
  let q = supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId);

  if (params.statuses?.length) {
    q = q.in("status", params.statuses);
  }

  if (params.sortBy === "created_desc") {
    q = q.order("created_at", { ascending: false });
  } else if (params.sortBy === "company_asc") {
    q = q.order("company_name", { ascending: true, nullsFirst: false });
  } else {
    q = q.order("last_activity_at", { ascending: true, nullsFirst: true });
  }

  q = q.limit(rowLimit);

  const { data, error } = await q;
  assertNoError(error, "queryApplicationsForAgent");
  let apps = (data as ApplicationRow[] | null)?.map(fromRow) ?? [];

  if (params.daysStale !== undefined) {
    const now = Date.now();
    const ms = params.daysStale * 24 * 60 * 60 * 1000;
    apps = apps.filter((r) => {
      const last = (r.lastActivityAt ?? r.createdAt).getTime();
      return now - last >= ms;
    });
  }

  const applications = apps.map((r) => {
    const last = r.lastActivityAt ?? r.createdAt;
    const daysSinceActivity = Math.floor(
      (Date.now() - last.getTime()) / (24 * 60 * 60 * 1000)
    );
    return {
      id: r.id,
      companyName: r.companyName ?? null,
      role: r.role,
      status: r.status,
      daysSinceActivity,
      appliedAt: r.appliedAt ? r.appliedAt.toISOString() : null,
      tier: r.tier,
    };
  });

  return { applications, total: applications.length, rowLimit };
}

/**
 * Return applications filtered by one or more statuses.
 */
export async function getApplicationsByStatus(
  userId: string,
  statuses: ApplicationStatus[]
): Promise<Application[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .in("status", statuses)
    .order("last_activity_at", { ascending: false });

  assertNoError(error, "getApplicationsByStatus");
  return (data as ApplicationRow[] | null)?.map(fromRow) ?? [];
}

/**
 * Return a single application by ID.
 */
export async function getApplicationById(
  userId: string,
  id: string
): Promise<Application | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  assertNoError(error, "getApplicationById");
  if (!data) return null;
  return fromRow(data as ApplicationRow);
}

function normalizeRpcByStatus(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isNaN(n)) out[k] = n;
  }
  return out;
}

async function getPipelineStatsLegacy(userId: string): Promise<PipelineStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("status, last_activity_at, created_at")
    .eq("user_id", userId);

  assertNoError(error, "getPipelineStats");
  const rows = (data ?? []) as Array<{
    status: string | null;
    last_activity_at: string | null;
    created_at: string;
  }>;

  const now = new Date();
  const staleMs = STALE_DAYS * 24 * 60 * 60 * 1000;
  const warmMs = 7 * 24 * 60 * 60 * 1000;

  const byStatus: Record<string, number> = {};
  let staleCount = 0;
  let warmCount = 0;

  for (const row of rows) {
    const s = row.status ?? "discovered";
    byStatus[s] = (byStatus[s] ?? 0) + 1;

    const lastRaw = row.last_activity_at ?? row.created_at;
    const last = new Date(lastRaw);
    const diffMs = now.getTime() - last.getTime();
    if (diffMs >= staleMs) staleCount++;
    else if (diffMs >= warmMs) warmCount++;
  }

  const totalActive = rows.filter(
    (r) => !["accepted", "rejected", "withdrawn"].includes(r.status ?? "")
  ).length;

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyActivity = rows.filter((r) => {
    const last = new Date(r.last_activity_at ?? r.created_at);
    return last >= weekAgo;
  }).length;

  return buildPipelineStatsFromAggregates(
    byStatus,
    totalActive,
    staleCount,
    warmCount,
    weeklyActivity
  );
}

/**
 * Pipeline stats: prefers DB RPC `pipeline_stats_for_user` (Phase 3 migration).
 * Falls back to row scan if the function is not installed yet.
 */
export async function getPipelineStats(userId: string): Promise<PipelineStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pipeline_stats_for_user", {
    p_user_id: userId,
  });

  if (!error && data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const byStatus = normalizeRpcByStatus(d.byStatus);
    const totalActive = Number(d.totalActive ?? 0);
    const staleCount = Number(d.staleCount ?? 0);
    const warmCount = Number(d.warmCount ?? 0);
    const weeklyActivity = Number(d.weeklyActivity ?? 0);
    return buildPipelineStatsFromAggregates(
      byStatus,
      totalActive,
      staleCount,
      warmCount,
      weeklyActivity
    );
  }

  return getPipelineStatsLegacy(userId);
}

/**
 * Create a new application.
 */
export async function createApplication(
  input: NewApplicationInput
): Promise<Application> {
  const supabase = await createClient();
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
      position: `init_${Date.now()}`,
      last_activity_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  assertNoError(error, "createApplication");
  return fromRow(data as ApplicationRow);
}

/**
 * Update an existing application (partial).
 */
export async function updateApplication(
  userId: string,
  id: string,
  input: UpdateApplicationInput
): Promise<Application> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  };

  if (input.companyName !== undefined) patch.company_name = input.companyName;
  if (input.role !== undefined) patch.role = input.role;
  if (input.url !== undefined) patch.url = input.url || null;
  if (input.status !== undefined) patch.status = input.status;
  if (input.source !== undefined) patch.source = input.source ?? null;
  if (input.notes !== undefined) patch.notes = input.notes ?? null;
  if (input.location !== undefined) patch.location = input.location ?? null;
  if (input.salary !== undefined) patch.salary = input.salary ?? null;
  if (input.sector !== undefined) patch.sector = input.sector ?? null;
  if (input.tier !== undefined) patch.tier = input.tier ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();

  assertNoError(error, "updateApplication");
  return fromRow(data as ApplicationRow);
}

/**
 * Update status and optional position (drag-and-drop).
 */
export async function updateApplicationStatus(
  userId: string,
  id: string,
  newStatus: ApplicationStatus,
  newPosition?: string
): Promise<Application> {
  const patch: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  };
  if (newPosition !== undefined) patch.position = newPosition;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();

  assertNoError(error, "updateApplicationStatus");
  return fromRow(data as ApplicationRow);
}

/**
 * Delete an application by ID.
 */
export async function deleteApplication(
  userId: string,
  id: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  assertNoError(error, "deleteApplication");
}

/**
 * Bulk-move applications to a new status.
 */
export async function bulkUpdateStatus(
  userId: string,
  ids: string[],
  newStatus: ApplicationStatus
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .in("id", ids);

  assertNoError(error, "bulkUpdateStatus");
}
