import { db, schema } from "@/db";
import { eq, and, count, sql, desc, asc, inArray, lt } from "drizzle-orm";
import type { Application } from "@/db/schema";
import {
  createApplicationSchema,
  updateApplicationSchema,
} from "@/lib/validators/application";
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
  ApplicationStatus,
} from "@/lib/validators/application";
import { getPositionAfter } from "@/lib/utils/lex-order";

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
  /** Count per status key — for CRO whiteboard display */
  byStatus: Record<string, number>;
  /** Applied-to-screening conversion rate (0–100) */
  appliedToScreeningRate: number;
  /** Screen-to-interview conversion rate (0–100) */
  screeningToInterviewRate: number;
  /** Interview-to-offer conversion rate (0–100) */
  interviewToOfferRate: number;
  /** Number of applications with no activity in 14+ days */
  staleCount: number;
  /** Number of applications with no activity in 7–13 days */
  warmCount: number;
  /** Overall conversion label for display */
  conversionLabel: string;
}

// Re-export for consumers
export type { Application };
export type NewApplicationInput = CreateApplicationInput & { userId: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STALE_DAYS = 14;

function staleThreshold(): Date {
  const d = new Date();
  d.setDate(d.getDate() - STALE_DAYS);
  return d;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Return all applications for a user, ordered by status then position.
 * RLS enforces ownership; userId is passed for defense-in-depth.
 */
export async function getApplicationsByUser(userId: string): Promise<Application[]> {
  return db
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.userId, userId))
    .orderBy(asc(schema.applications.status), asc(schema.applications.position));
}

/**
 * Return applications filtered by one or more statuses.
 */
export async function getApplicationsByStatus(
  userId: string,
  statuses: ApplicationStatus[]
): Promise<Application[]> {
  return db
    .select()
    .from(schema.applications)
    .where(
      and(
        eq(schema.applications.userId, userId),
        inArray(schema.applications.status, statuses)
      )
    )
    .orderBy(desc(schema.applications.lastActivityAt));
}

/**
 * Return a single application by ID.
 */
export async function getApplicationById(
  userId: string,
  id: string
): Promise<Application | null> {
  const rows = await db
    .select()
    .from(schema.applications)
    .where(
      and(
        eq(schema.applications.userId, userId),
        eq(schema.applications.id, id)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Compute pipeline statistics for the CRO agent and dashboard.
 */
export async function getPipelineStats(userId: string): Promise<PipelineStats> {
  const all = await db
    .select({
      status: schema.applications.status,
      lastActivityAt: schema.applications.lastActivityAt,
      createdAt: schema.applications.createdAt,
    })
    .from(schema.applications)
    .where(eq(schema.applications.userId, userId));

  const now = new Date();
  const staleMs = STALE_DAYS * 24 * 60 * 60 * 1000;
  const warmMs = 7 * 24 * 60 * 60 * 1000;

  const byStatus: Record<string, number> = {};
  let staleCount = 0;
  let warmCount = 0;

  for (const row of all) {
    const s = row.status ?? "discovered";
    byStatus[s] = (byStatus[s] ?? 0) + 1;

    const last = row.lastActivityAt ?? row.createdAt;
    const diffMs = now.getTime() - last.getTime();
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
    const last = r.lastActivityAt ?? r.createdAt;
    return last >= weekAgo;
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
 * Create a new application.
 */
export async function createApplication(
  input: NewApplicationInput
): Promise<Application> {
  const rows = await db
    .insert(schema.applications)
    .values({
      userId: input.userId,
      companyName: input.companyName,
      role: input.role,
      url: input.url ?? null,
      status: input.status ?? "discovered",
      source: input.source ?? null,
      notes: input.notes ?? null,
      location: input.location ?? null,
      salary: input.salary ?? null,
      sector: input.sector ?? null,
      tier: input.tier ?? null,
      lastActivityAt: new Date(),
    })
    .returning();
  return rows[0];
}

/**
 * Update an existing application (partial).
 */
export async function updateApplication(
  userId: string,
  id: string,
  input: UpdateApplicationInput
): Promise<Application> {
  const rows = await db
    .update(schema.applications)
    .set({
      ...input,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(
      and(
        eq(schema.applications.userId, userId),
        eq(schema.applications.id, id)
      )
    )
    .returning();
  return rows[0];
}

/**
 * Update just the status field of an application.
 */
export async function updateApplicationStatus(
  userId: string,
  id: string,
  newStatus: ApplicationStatus,
  newPosition?: string
): Promise<Application> {
  const rows = await db
    .update(schema.applications)
    .set({
      status: newStatus,
      ...(newPosition ? { position: newPosition } : {}),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(
      and(
        eq(schema.applications.userId, userId),
        eq(schema.applications.id, id)
      )
    )
    .returning();
  return rows[0];
}

/**
 * Delete an application by ID.
 */
export async function deleteApplication(
  userId: string,
  id: string
): Promise<void> {
  await db
    .delete(schema.applications)
    .where(
      and(
        eq(schema.applications.userId, userId),
        eq(schema.applications.id, id)
      )
    );
}

/**
 * Bulk-move applications to a new status.
 */
export async function bulkUpdateStatus(
  userId: string,
  ids: string[],
  newStatus: ApplicationStatus
): Promise<void> {
  await db
    .update(schema.applications)
    .set({
      status: newStatus,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(
      and(
        eq(schema.applications.userId, userId),
        inArray(schema.applications.id, ids)
      )
    );
}
