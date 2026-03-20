/**
 * Daily Snapshots queries via Supabase REST.
 * Stores daily pipeline snapshots for trend analysis.
 */

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailySnapshot {
  id: string;
  userId: string;
  date: string;
  totalApplications: number;
  activePipeline: number;
  interviewsScheduled: number;
  offers: number;
  rejections: number;
  emailsProcessed: number;
  agentsRuns: number;
  totalCostCents: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function rowToSnapshot(row: Record<string, unknown>): DailySnapshot {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    date: row.date as string,
    totalApplications: (row.total_applications as number) ?? 0,
    activePipeline: (row.active_pipeline as number) ?? 0,
    interviewsScheduled: (row.interviews_scheduled as number) ?? 0,
    offers: (row.offers as number) ?? 0,
    rejections: (row.rejections as number) ?? 0,
    emailsProcessed: (row.emails_processed as number) ?? 0,
    agentsRuns: (row.agents_runs as number) ?? 0,
    totalCostCents: (row.total_cost_cents as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get daily snapshots for a user, ordered by date descending.
 */
export async function getDailySnapshots(
  userId: string,
  limit: number = 30,
): Promise<DailySnapshot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch daily snapshots:", error.message);
    return [];
  }

  return (data ?? []).map(rowToSnapshot);
}

/**
 * Create or update today's snapshot.
 * Uses upsert on (user_id, date) — if today's snapshot exists, it's updated.
 */
export async function upsertDailySnapshot(
  userId: string,
  snapshot: Omit<DailySnapshot, "id" | "userId" | "createdAt" | "updatedAt">,
): Promise<DailySnapshot | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_snapshots")
    .upsert(
      {
        user_id: userId,
        date: snapshot.date,
        total_applications: snapshot.totalApplications,
        active_pipeline: snapshot.activePipeline,
        interviews_scheduled: snapshot.interviewsScheduled,
        offers: snapshot.offers,
        rejections: snapshot.rejections,
        emails_processed: snapshot.emailsProcessed,
        agents_runs: snapshot.agentsRuns,
        total_cost_cents: snapshot.totalCostCents,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" },
    )
    .select("*")
    .single();

  if (error) {
    console.error("Failed to upsert daily snapshot:", error.message);
    return null;
  }

  return data ? rowToSnapshot(data as Record<string, unknown>) : null;
}

/**
 * Get the most recent snapshot for comparison (yesterday or last available).
 */
export async function getLastSnapshot(
  userId: string,
): Promise<DailySnapshot | null> {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_snapshots")
    .select("*")
    .eq("user_id", userId)
    .lt("date", today)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data ? rowToSnapshot(data as Record<string, unknown>) : null;
}
