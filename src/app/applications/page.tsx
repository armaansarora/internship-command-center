import { db } from '@/db';
import { applications, companies, contacts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Status, Tier } from '@/types';
import { ApplicationsClientPage } from './applications-client';

const statusMap: Record<string, Status> = {
  discovered: 'applied',
  applied: 'applied',
  screening: 'in_progress',
  interview_scheduled: 'interview',
  interviewing: 'interview',
  under_review: 'under_review',
  offer: 'offer',
  accepted: 'offer',
  rejected: 'rejected',
  withdrawn: 'rejected',
};

const tierMap: Record<number, Tier> = {
  1: 'T1',
  2: 'T2',
  3: 'T3',
  4: 'T4',
};

export default async function ApplicationsPage() {
  const rows = await db
    .select({
      id: applications.id,
      companyName: companies.name,
      role: applications.role,
      status: applications.status,
      tier: applications.tier,
      source: applications.source,
      appliedAt: applications.appliedAt,
      notes: applications.notes,
      contactName: contacts.name,
      contactEmail: contacts.email,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(contacts, eq(applications.contactId, contacts.id))
    .orderBy(desc(applications.createdAt));

  const data = rows.map((row) => ({
    id: row.id,
    company: row.companyName,
    role: row.role,
    status: statusMap[row.status] ?? ('applied' as Status),
    tier: tierMap[row.tier ?? 3] ?? ('T3' as Tier),
    source: row.source ?? '',
    appliedAt: row.appliedAt ?? '',
    notes: row.notes ?? '',
    contactName: row.contactName ?? '',
    contactEmail: row.contactEmail ?? '',
  }));

  return <ApplicationsClientPage data={data} />;
}
