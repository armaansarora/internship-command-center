import { db } from '@/db';
import { outreachQueue, applications, companies, contacts } from '@/db/schema';
import { eq, and, lt, not, inArray } from 'drizzle-orm';
import { suggestFollowUpDays } from '@/lib/tier-utils';

export interface FollowUpWithApp {
  followUp: {
    id: number;
    applicationId: number;
    dueAt: Date;
    note: string | null;
    completedAt: Date | null;
    dismissed: boolean;
  };
  application: {
    id: number;
    company: string;
    role: string;
    tier: string;
    status: string;
    contactName: string | null;
    contactEmail: string | null;
  };
}

function mapRowToFollowUpWithApp(row: {
  outreach_queue: typeof outreachQueue.$inferSelect;
  applications: typeof applications.$inferSelect | null;
  companies: typeof companies.$inferSelect | null;
  contacts: typeof contacts.$inferSelect | null;
}): FollowUpWithApp {
  const oq = row.outreach_queue;
  const app = row.applications;
  const co = row.companies;
  const ct = row.contacts;

  return {
    followUp: {
      id: oq.id as unknown as number,
      applicationId: oq.applicationId as unknown as number,
      dueAt: new Date(oq.createdAt),
      note: oq.body ?? null,
      completedAt: null,
      dismissed: false,
    },
    application: {
      id: (app?.id ?? oq.applicationId) as unknown as number,
      company: co?.name ?? 'Unknown',
      role: app?.role ?? 'Unknown',
      tier: String(app?.tier ?? ''),
      status: app?.status ?? '',
      contactName: ct?.name ?? null,
      contactEmail: ct?.email ?? null,
    },
  };
}

export async function getPendingFollowUps(): Promise<FollowUpWithApp[]> {
  const rows = await db
    .select()
    .from(outreachQueue)
    .leftJoin(applications, eq(outreachQueue.applicationId, applications.id))
    .leftJoin(companies, eq(outreachQueue.companyId, companies.id))
    .leftJoin(contacts, eq(outreachQueue.contactId, contacts.id))
    .where(
      and(
        eq(outreachQueue.status, 'pending_approval'),
        eq(outreachQueue.type, 'follow_up')
      )
    );

  return rows.map(mapRowToFollowUpWithApp);
}

export async function getOverdueFollowUps(): Promise<FollowUpWithApp[]> {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const rows = await db
    .select()
    .from(outreachQueue)
    .leftJoin(applications, eq(outreachQueue.applicationId, applications.id))
    .leftJoin(companies, eq(outreachQueue.companyId, companies.id))
    .leftJoin(contacts, eq(outreachQueue.contactId, contacts.id))
    .where(
      and(
        eq(outreachQueue.status, 'pending_approval'),
        eq(outreachQueue.type, 'follow_up'),
        lt(outreachQueue.createdAt, sevenDaysAgo)
      )
    );

  return rows.map(mapRowToFollowUpWithApp);
}

export async function getSuggestedFollowUps(): Promise<
  Array<{ application: unknown; suggestedDays: number; suggestedDate: Date }>
> {
  const activeStatuses = [
    'applied',
    'screening',
    'interview_scheduled',
    'interviewing',
  ] as const;

  // Get applications in active statuses
  const activeApps = await db
    .select({
      id: applications.id,
      role: applications.role,
      status: applications.status,
      tier: applications.tier,
      companyId: applications.companyId,
      companyName: companies.name,
      contactName: contacts.name,
      contactEmail: contacts.email,
      appliedAt: applications.appliedAt,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(contacts, eq(applications.contactId, contacts.id))
    .where(inArray(applications.status, activeStatuses));

  // Get application IDs that already have pending outreach
  const pendingOutreach = await db
    .select({ applicationId: outreachQueue.applicationId })
    .from(outreachQueue)
    .where(
      and(
        eq(outreachQueue.status, 'pending_approval'),
        not(eq(outreachQueue.type, 'cover_letter_send'))
      )
    );

  const pendingAppIds = new Set(
    pendingOutreach.map((r) => r.applicationId).filter(Boolean)
  );

  const results: Array<{
    application: unknown;
    suggestedDays: number;
    suggestedDate: Date;
  }> = [];

  for (const app of activeApps) {
    if (pendingAppIds.has(app.id)) continue;

    const tierStr = `T${app.tier ?? 4}`;
    const days = suggestFollowUpDays(tierStr, app.status ?? 'applied');
    const baseDate = app.appliedAt ? new Date(app.appliedAt) : new Date();
    const suggestedDate = new Date(
      baseDate.getTime() + days * 24 * 60 * 60 * 1000
    );

    results.push({
      application: {
        id: app.id as unknown as number,
        company: app.companyName,
        role: app.role,
        tier: tierStr,
        status: app.status ?? 'applied',
        contactName: app.contactName ?? null,
        contactEmail: app.contactEmail ?? null,
      },
      suggestedDays: days,
      suggestedDate,
    });
  }

  return results;
}
