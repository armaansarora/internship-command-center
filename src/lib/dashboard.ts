import { db } from '@/db';
import {
  applications,
  companies,
  contacts,
  outreachQueue,
  interviews,
} from '@/db/schema';
import { eq, desc, and, sql, gte, count, inArray, lte, or } from 'drizzle-orm';

export interface ActionItem {
  id: number;
  company: string;
  role: string;
  tier: string;
  status: string;
  reason: string;
  priority: number;
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

export async function getStatusCounts(): Promise<StatusCounts> {
  const rows = await db
    .select({
      status: applications.status,
      count: count(),
    })
    .from(applications)
    .groupBy(applications.status);

  const map: Record<string, number> = {};
  for (const r of rows) {
    map[r.status] = r.count;
  }

  const total = Object.values(map).reduce((a, b) => a + b, 0);

  return {
    total,
    applied: (map['applied'] ?? 0) + (map['discovered'] ?? 0),
    in_progress: map['screening'] ?? 0,
    interview:
      (map['interview_scheduled'] ?? 0) + (map['interviewing'] ?? 0),
    under_review: map['under_review'] ?? 0,
    offer: (map['offer'] ?? 0) + (map['accepted'] ?? 0),
    rejected: (map['rejected'] ?? 0) + (map['withdrawn'] ?? 0),
  };
}

export async function getActionItems(): Promise<ActionItem[]> {
  const now = new Date().toISOString();
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const twentyOneDaysAgo = new Date(
    Date.now() - 21 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const items: ActionItem[] = [];

  // Priority 1: Upcoming scheduled interviews
  const upcomingInterviews = await db
    .select({
      id: interviews.id,
      company: companies.name,
      role: applications.role,
      tier: applications.tier,
      status: applications.status,
      appliedAt: applications.appliedAt,
      scheduledAt: interviews.scheduledAt,
      contactName: contacts.name,
    })
    .from(interviews)
    .innerJoin(applications, eq(interviews.applicationId, applications.id))
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(contacts, eq(applications.contactId, contacts.id))
    .where(
      and(
        eq(interviews.status, 'scheduled'),
        gte(interviews.scheduledAt, now),
      ),
    )
    .orderBy(interviews.scheduledAt);

  for (const row of upcomingInterviews) {
    items.push({
      id: row.id as unknown as number,
      company: row.company,
      role: row.role,
      tier: String(row.tier ?? ''),
      status: row.status ?? 'discovered',
      reason: `Interview scheduled for ${new Date(row.scheduledAt!).toLocaleDateString()}`,
      priority: 1,
      appliedAt: row.appliedAt ? new Date(row.appliedAt) : new Date(),
      contactName: row.contactName ?? null,
    });
  }

  // Priority 2: Stale leads - applied/discovered > 14 days with no recent update
  const staleLeads = await db
    .select({
      id: applications.id,
      company: companies.name,
      role: applications.role,
      tier: applications.tier,
      status: applications.status,
      appliedAt: applications.appliedAt,
      contactName: contacts.name,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(contacts, eq(applications.contactId, contacts.id))
    .where(
      and(
        inArray(applications.status, ['applied', 'discovered']),
        lte(applications.updatedAt, fourteenDaysAgo),
      ),
    )
    .orderBy(applications.updatedAt);

  for (const row of staleLeads) {
    items.push({
      id: row.id as unknown as number,
      company: row.company,
      role: row.role,
      tier: String(row.tier ?? ''),
      status: row.status ?? 'discovered',
      reason: 'No activity for 14+ days — consider following up',
      priority: 2,
      appliedAt: row.appliedAt ? new Date(row.appliedAt) : new Date(),
      contactName: row.contactName ?? null,
    });
  }

  // Priority 3: Pending outreach older than 7 days
  const pendingOutreach = await db
    .select({
      id: outreachQueue.id,
      company: companies.name,
      role: applications.role,
      tier: applications.tier,
      status: applications.status,
      appliedAt: applications.appliedAt,
      contactName: contacts.name,
    })
    .from(outreachQueue)
    .leftJoin(
      applications,
      eq(outreachQueue.applicationId, applications.id),
    )
    .leftJoin(companies, eq(outreachQueue.companyId, companies.id))
    .leftJoin(contacts, eq(outreachQueue.contactId, contacts.id))
    .where(
      and(
        eq(outreachQueue.status, 'pending_approval'),
        lte(outreachQueue.createdAt, sevenDaysAgo),
      ),
    )
    .orderBy(outreachQueue.createdAt);

  for (const row of pendingOutreach) {
    items.push({
      id: row.id as unknown as number,
      company: row.company ?? 'Unknown',
      role: row.role ?? 'Unknown',
      tier: String(row.tier ?? ''),
      status: row.status ?? '',
      reason: 'Outreach pending approval for 7+ days',
      priority: 3,
      appliedAt: row.appliedAt ? new Date(row.appliedAt) : new Date(),
      contactName: row.contactName ?? null,
    });
  }

  // Priority 4: No response after 21 days (screening or applied status)
  const noResponse = await db
    .select({
      id: applications.id,
      company: companies.name,
      role: applications.role,
      tier: applications.tier,
      status: applications.status,
      appliedAt: applications.appliedAt,
      contactName: contacts.name,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(contacts, eq(applications.contactId, contacts.id))
    .where(
      and(
        inArray(applications.status, ['applied', 'screening']),
        lte(applications.updatedAt, twentyOneDaysAgo),
      ),
    )
    .orderBy(applications.updatedAt);

  for (const row of noResponse) {
    // Skip if already included as a stale lead
    if (items.some((i) => i.id === (row.id as unknown as number) && i.priority === 2)) {
      continue;
    }
    items.push({
      id: row.id as unknown as number,
      company: row.company,
      role: row.role,
      tier: String(row.tier ?? ''),
      status: row.status ?? 'applied',
      reason: 'No response after 21+ days — may need escalation',
      priority: 4,
      appliedAt: row.appliedAt ? new Date(row.appliedAt) : new Date(),
      contactName: row.contactName ?? null,
    });
  }

  // Sort by priority, then by appliedAt
  items.sort((a, b) => a.priority - b.priority || a.appliedAt.getTime() - b.appliedAt.getTime());

  return items;
}

export async function getTrackedCompanyNames(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: companies.name })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .orderBy(companies.name);

  return rows.map((r) => r.name);
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const rows = await db
    .select({
      id: applications.id,
      company: companies.name,
      role: applications.role,
      status: applications.status,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(gte(applications.updatedAt, sevenDaysAgo))
    .orderBy(desc(applications.updatedAt))
    .limit(20);

  return rows.map((r) => ({
    id: r.id as unknown as number,
    company: r.company,
    role: r.role,
    status: r.status ?? 'discovered',
    updatedAt: new Date(r.updatedAt),
  }));
}
