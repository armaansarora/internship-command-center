import { db } from '@/db';
import { applications, followUps } from '@/db/schema';
import { eq, and, desc, lte, isNull, sql } from 'drizzle-orm';

export interface ActionItem {
  id: number;
  company: string;
  role: string;
  tier: string;
  status: string;
  reason: string;
  priority: number; // lower = more urgent
  appliedAt: Date;
  contactName: string | null;
}

export interface StatusCounts {
  total: number;
  applied: number;
  in_progress: number;
  interview: number;
  under_review: number;
  rejected: number;
  offer: number;
}

export interface ActivityItem {
  id: number;
  company: string;
  role: string;
  status: string;
  updatedAt: Date;
}

/**
 * Get urgent action items, ranked by priority:
 * 1. Interviews (need prep)
 * 2. Stale warm leads (in_progress > 7 days without update)
 * 3. Overdue follow-ups
 * 4. T1 no-response (applied > 14 days)
 */
export async function getActionItems(): Promise<ActionItem[]> {
  const now = new Date();
  const items: ActionItem[] = [];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Fetch only actionable applications in one query instead of loading ALL apps
  const actionableApps = await db
    .select()
    .from(applications)
    .where(
      sql`${applications.status} = 'interview'
        OR (${applications.status} = 'in_progress' AND ${applications.updatedAt} <= ${sevenDaysAgo})
        OR (${applications.tier} = 'T1' AND ${applications.status} = 'applied' AND ${applications.appliedAt} <= ${fourteenDaysAgo})`
    )
    .all();

  for (const app of actionableApps) {
    // Priority 1: Active interviews
    if (app.status === 'interview') {
      items.push({
        id: app.id,
        company: app.company,
        role: app.role,
        tier: app.tier,
        status: app.status,
        reason: 'Interview — prep needed',
        priority: 1,
        appliedAt: app.appliedAt,
        contactName: app.contactName,
      });
      continue;
    }

    const daysSinceUpdate = Math.floor(
      (now.getTime() - app.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceApplied = Math.floor(
      (now.getTime() - app.appliedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Priority 2: Stale warm leads (in_progress, no update in 7+ days)
    if (app.status === 'in_progress' && daysSinceUpdate >= 7) {
      items.push({
        id: app.id,
        company: app.company,
        role: app.role,
        tier: app.tier,
        status: app.status,
        reason: `Warm lead going cold — ${daysSinceUpdate}d since update`,
        priority: 2,
        appliedAt: app.appliedAt,
        contactName: app.contactName,
      });
      continue;
    }

    // Priority 4: T1 no-response (applied > 14 days)
    if (
      app.tier === 'T1' &&
      app.status === 'applied' &&
      daysSinceApplied >= 14
    ) {
      items.push({
        id: app.id,
        company: app.company,
        role: app.role,
        tier: app.tier,
        status: app.status,
        reason: `T1 no response — ${daysSinceApplied}d since applied`,
        priority: 4,
        appliedAt: app.appliedAt,
        contactName: app.contactName,
      });
    }
  }

  // Priority 3: Overdue follow-ups
  const overdueFollowUps = await db
    .select({
      followUpId: followUps.id,
      applicationId: followUps.applicationId,
      dueAt: followUps.dueAt,
      note: followUps.note,
      company: applications.company,
      role: applications.role,
      tier: applications.tier,
      status: applications.status,
      appliedAt: applications.appliedAt,
      contactName: applications.contactName,
    })
    .from(followUps)
    .innerJoin(applications, eq(followUps.applicationId, applications.id))
    .where(
      and(
        lte(followUps.dueAt, now),
        isNull(followUps.completedAt),
        eq(followUps.dismissed, false)
      )
    )
    .all();

  for (const fu of overdueFollowUps) {
    // Don't duplicate if already in the list
    if (!items.some((i) => i.id === fu.applicationId)) {
      items.push({
        id: fu.applicationId,
        company: fu.company,
        role: fu.role,
        tier: fu.tier,
        status: fu.status,
        reason: `Follow-up overdue${fu.note ? `: ${fu.note}` : ''}`,
        priority: 3,
        appliedAt: fu.appliedAt,
        contactName: fu.contactName,
      });
    }
  }

  // Sort by priority, then by tier (T1 first)
  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const tierOrder = { T1: 0, T2: 1, T3: 2, T4: 3 };
    return (
      (tierOrder[a.tier as keyof typeof tierOrder] ?? 3) -
      (tierOrder[b.tier as keyof typeof tierOrder] ?? 3)
    );
  });

  return items;
}

/**
 * Get status breakdown counts using SQL aggregation
 */
export async function getStatusCounts(): Promise<StatusCounts> {
  const rows = await db
    .select({
      status: applications.status,
      count: sql<number>`count(*)`,
    })
    .from(applications)
    .groupBy(applications.status)
    .all();

  const counts: StatusCounts = {
    total: 0,
    applied: 0,
    in_progress: 0,
    interview: 0,
    under_review: 0,
    rejected: 0,
    offer: 0,
  };

  for (const row of rows) {
    const n = Number(row.count);
    counts.total += n;
    if (row.status in counts) {
      counts[row.status as keyof Omit<StatusCounts, 'total'>] = n;
    }
  }

  return counts;
}

/**
 * Get distinct company names from all tracked applications.
 * Used for matching emails to companies.
 */
export async function getTrackedCompanyNames(): Promise<string[]> {
  const rows = await db
    .select({ company: applications.company })
    .from(applications)
    .all();

  return [...new Set(rows.map((r) => r.company))];
}

/**
 * Get recent activity (last 10 updated applications)
 */
export async function getRecentActivity(): Promise<ActivityItem[]> {
  return await db
    .select({
      id: applications.id,
      company: applications.company,
      role: applications.role,
      status: applications.status,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .orderBy(desc(applications.updatedAt))
    .limit(10)
    .all();
}
